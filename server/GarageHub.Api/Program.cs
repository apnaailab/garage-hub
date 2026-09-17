using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using GarageHub.Api;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var connection = builder.Configuration.GetConnectionString("GarageHub") ?? "Data Source=garagehub.db";
if (connection.Contains("Host=", StringComparison.OrdinalIgnoreCase))
    builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(connection));
else
    builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlite(connection));

var jwtKey = builder.Configuration["Jwt:Key"] ?? "garagehub-local-development-key-change-before-production-2026";
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = "GarageHub",
        ValidateAudience = true,
        ValidAudience = "GarageHub.Web",
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = signingKey,
        ClockSkew = TimeSpan.FromMinutes(1)
    };
});
builder.Services.AddAuthorization();
builder.Services.AddSingleton<IMessageDelivery, LocalMessageDelivery>();
builder.Services.AddHostedService<ReminderWorker>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseStaticFiles();

using (var scope = app.Services.CreateScope())
    await SeedData.EnsureAsync(scope.ServiceProvider.GetRequiredService<AppDbContext>());

app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", at = DateTimeOffset.UtcNow }));

app.MapPost("/api/auth/login", async (LoginRequest request, AppDbContext db) =>
{
    var email = request.Email.Trim().ToLowerInvariant();
    var user = await db.Users.SingleOrDefaultAsync(x => x.Email == email && x.Active);
    if (user is null || !Passwords.Verify(request.Password, user.PasswordHash))
        return Results.Unauthorized();

    var claims = new[]
    {
        new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
        new Claim(ClaimTypes.Name, user.Name),
        new Claim(ClaimTypes.Email, user.Email),
        new Claim(ClaimTypes.Role, user.Role),
        new Claim("organization_id", user.OrganizationId.ToString())
    };
    var token = new JwtSecurityToken(
        issuer: "GarageHub",
        audience: "GarageHub.Web",
        claims: claims,
        expires: DateTime.UtcNow.AddHours(8),
        signingCredentials: new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256));
    var view = new UserView(user.Id, user.OrganizationId, user.Name, user.Email, user.Phone, user.Role, user.PhotoUrl, user.DrivingLicensePhotoUrl);
    return Results.Ok(new LoginResponse(new JwtSecurityTokenHandler().WriteToken(token), view));
});

var api = app.MapGroup("/api").RequireAuthorization();

api.MapGet("/workflow-state", async (ClaimsPrincipal principal, AppDbContext db) =>
{
    var organizationId = OrganizationId(principal);
    var snapshot = await db.WorkflowSnapshots.AsNoTracking().SingleOrDefaultAsync(x => x.OrganizationId == organizationId);
    if (snapshot is null) return Results.NotFound();
    using var document = JsonDocument.Parse(snapshot.DataJson);
    return Results.Ok(new WorkflowStateResponse(snapshot.Version, document.RootElement.Clone(), snapshot.UpdatedAt, snapshot.UpdatedById));
});

api.MapPut("/workflow-state", async (WorkflowStateRequest request, ClaimsPrincipal principal, AppDbContext db) =>
{
    var organizationId = OrganizationId(principal);
    var userId = UserId(principal);
    var dataJson = request.Data.GetRawText();
    if (dataJson.Length > 5_000_000) return Results.BadRequest(new { error = "Workflow state exceeds the 5 MB limit." });

    var snapshot = await db.WorkflowSnapshots.SingleOrDefaultAsync(x => x.OrganizationId == organizationId);
    if (snapshot is null)
    {
        if (request.BaseVersion != 0) return Results.Conflict(new { error = "Workflow state was initialized by another session. Reload and retry." });
        snapshot = new WorkflowSnapshot { OrganizationId = organizationId, Version = 1, DataJson = dataJson, UpdatedById = userId };
        db.WorkflowSnapshots.Add(snapshot);
    }
    else
    {
        if (snapshot.Version != request.BaseVersion)
        {
            using var currentDocument = JsonDocument.Parse(snapshot.DataJson);
            return Results.Conflict(new WorkflowStateResponse(snapshot.Version, currentDocument.RootElement.Clone(), snapshot.UpdatedAt, snapshot.UpdatedById));
        }
        snapshot.Version++;
        snapshot.DataJson = dataJson;
        snapshot.UpdatedById = userId;
        snapshot.UpdatedAt = DateTimeOffset.UtcNow;
    }

    Audit(db, principal, "synchronize", "workflow-state", snapshot.Id, $"version={snapshot.Version}");
    await db.SaveChangesAsync();
    using var savedDocument = JsonDocument.Parse(snapshot.DataJson);
    return Results.Ok(new WorkflowStateResponse(snapshot.Version, savedDocument.RootElement.Clone(), snapshot.UpdatedAt, snapshot.UpdatedById));
});

api.MapGet("/me", async (ClaimsPrincipal principal, AppDbContext db) =>
{
    var user = await db.Users.FindAsync(UserId(principal));
    return user is null ? Results.NotFound() : Results.Ok(ToView(user));
});

api.MapGet("/users", async (AppDbContext db) => Results.Ok(await db.Users
    .Where(x => x.Active)
    .OrderBy(x => x.Role).ThenBy(x => x.Name)
    .Select(x => new UserView(x.Id, x.OrganizationId, x.Name, x.Email, x.Phone, x.Role, x.PhotoUrl, x.DrivingLicensePhotoUrl)).ToListAsync()))
    .RequireAuthorization(p => p.RequireRole(AppRoles.Owner, AppRoles.Manager));

api.MapGet("/dashboard", async (ClaimsPrincipal principal, AppDbContext db) =>
{
    var userId = UserId(principal);
    var role = principal.FindFirstValue(ClaimTypes.Role)!;
    var jobs = db.Jobs.AsQueryable();
    if (role is AppRoles.Mechanic or AppRoles.HeadMechanic) jobs = jobs.Where(x => x.AssignedTechnicianId == userId);
    if (role == AppRoles.Driver)
    {
        var jobIds = db.PickupAssignments.Where(x => x.DriverId == userId).Select(x => x.JobId);
        jobs = jobs.Where(x => jobIds.Contains(x.Id));
    }
    if (role == AppRoles.Customer)
    {
        var customerIds = db.Customers.Where(x => x.UserId == userId).Select(x => x.Id);
        jobs = jobs.Where(x => customerIds.Contains(x.CustomerId));
    }

    var byStage = await jobs.GroupBy(x => x.Stage).Select(g => new { stage = g.Key, count = g.Count() }).ToListAsync();
    var lowStock = await db.InventoryParts.CountAsync(x => x.Quantity <= x.LowStockThreshold);
    var unread = await db.Notifications.CountAsync(x => x.RecipientId == userId && x.ReadAt == null);
    var activeReminders = await db.Reminders.Where(x => x.RecipientId == userId && !x.Completed).ToListAsync();
    var dueReminders = activeReminders.Count(x => x.DueAt <= DateTimeOffset.UtcNow.AddHours(24));
    var attendanceEvents = await db.Attendance.Where(x => x.UserId == userId).ToListAsync();
    var todayAttendance = attendanceEvents.Count(x => x.At.Date == DateTimeOffset.UtcNow.Date);
    return Results.Ok(new { role, totalJobs = await jobs.CountAsync(), byStage, lowStock, unread, dueReminders, todayAttendance });
});

api.MapGet("/jobs", async (ClaimsPrincipal principal, AppDbContext db) =>
{
    var userId = UserId(principal);
    var role = principal.FindFirstValue(ClaimTypes.Role)!;
    var query = db.Jobs.AsNoTracking().AsQueryable();
    if (role is AppRoles.Mechanic or AppRoles.HeadMechanic) query = query.Where(x => x.AssignedTechnicianId == userId);
    if (role == AppRoles.Customer)
    {
        var customers = db.Customers.Where(x => x.UserId == userId).Select(x => x.Id);
        query = query.Where(x => customers.Contains(x.CustomerId));
    }
    if (role == AppRoles.Driver)
    {
        var assigned = db.PickupAssignments.Where(x => x.DriverId == userId).Select(x => x.JobId);
        query = query.Where(x => assigned.Contains(x.Id));
    }
    var result = await query.Take(200).ToListAsync();
    return Results.Ok(result.OrderByDescending(x => x.CreatedAt));
});

api.MapPost("/jobs", async (Job job, ClaimsPrincipal principal, AppDbContext db) =>
{
    job.Id = Guid.NewGuid();
    job.CreatedAt = job.UpdatedAt = DateTimeOffset.UtcNow;
    db.Jobs.Add(job);
    Audit(db, principal, "create", "job", job.Id, job.Number);
    await db.SaveChangesAsync();
    return Results.Created($"/api/jobs/{job.Id}", job);
}).RequireAuthorization(p => p.RequireRole(AppRoles.Owner, AppRoles.Manager, AppRoles.Receptionist));

api.MapPatch("/jobs/{id:guid}/stage", async (Guid id, JobStageRequest request, ClaimsPrincipal principal, AppDbContext db) =>
{
    var allowedStages = new[] { "pending-for-pickup", "pending-from-technician", "pending-for-estimate", "pending-for-customer-approval", "pending-for-owner-approval", "pending-for-parts", "pending-from-accountant", "pending-for-payment", "pending-for-drop-off", "delivered" };
    if (!allowedStages.Contains(request.Stage)) return Results.BadRequest(new { error = "Unknown workflow stage" });
    var job = await db.Jobs.FindAsync(id);
    if (job is null) return Results.NotFound();
    job.Stage = request.Stage;
    job.UpdatedAt = DateTimeOffset.UtcNow;
    Audit(db, principal, "change-stage", "job", id, request.Stage);
    await db.SaveChangesAsync();
    return Results.Ok(job);
});

api.MapPost("/jobs/{id:guid}/estimate-action", async (Guid id, EstimateActionRequest request, ClaimsPrincipal principal, AppDbContext db) =>
{
    var job = await db.Jobs.FindAsync(id);
    if (job is null) return Results.NotFound();
    var role = principal.FindFirstValue(ClaimTypes.Role);

    switch (request.Action)
    {
        case "manager-submit" when role == AppRoles.Manager && job.Stage == "pending-for-estimate":
            job.Stage = "pending-for-customer-approval";
            break;
        case "customer-approve" when role == AppRoles.Customer && job.Stage == "pending-for-customer-approval":
            if (!await CanAccessJob(id, principal, db)) return Results.Forbid();
            job.CustomerEstimateApproved = true;
            if (!string.IsNullOrWhiteSpace(request.SelectedItemsJson)) job.ServicesJson = request.SelectedItemsJson;
            job.Stage = "pending-for-owner-approval";
            break;
        case "owner-approve" when role == AppRoles.Owner && job.Stage == "pending-for-owner-approval" && job.CustomerEstimateApproved:
            job.OwnerEstimateApproved = true;
            job.Stage = "pending-from-technician";
            break;
        default:
            return Results.Conflict(new { error = "This action is not valid for the current role or estimate state." });
    }

    job.UpdatedAt = DateTimeOffset.UtcNow;
    Audit(db, principal, request.Action, "job-estimate", id, job.Stage);
    await db.SaveChangesAsync();
    return Results.Ok(job);
});

api.MapGet("/customers", async (AppDbContext db) => Results.Ok(await db.Customers.AsNoTracking().OrderBy(x => x.Name).ToListAsync()))
    .RequireAuthorization(p => p.RequireRole(AppRoles.Owner, AppRoles.Manager, AppRoles.Accountant));
api.MapGet("/vehicles", async (AppDbContext db) => Results.Ok(await db.Vehicles.AsNoTracking().Where(x => x.Active).OrderBy(x => x.RegistrationNumber).ToListAsync()));

api.MapGet("/inventory", async (AppDbContext db) => Results.Ok(await db.InventoryParts.AsNoTracking().OrderBy(x => x.Name).ToListAsync()))
    .RequireAuthorization(p => p.RequireRole(AppRoles.Owner, AppRoles.Manager, AppRoles.Accountant, AppRoles.Mechanic, AppRoles.HeadMechanic));
api.MapPost("/inventory", async (InventoryPart part, ClaimsPrincipal principal, AppDbContext db) =>
{
    part.Id = Guid.NewGuid();
    db.InventoryParts.Add(part);
    Audit(db, principal, "create", "inventory-part", part.Id, part.Sku);
    await db.SaveChangesAsync();
    return Results.Created($"/api/inventory/{part.Id}", part);
}).RequireAuthorization(p => p.RequireRole(AppRoles.Owner, AppRoles.Accountant));

api.MapPatch("/inventory/{id:guid}", async (Guid id, InventoryPart request, ClaimsPrincipal principal, AppDbContext db) =>
{
    var part = await db.InventoryParts.FindAsync(id);
    if (part is null) return Results.NotFound();
    part.Name = request.Name;
    part.UnitCost = request.UnitCost;
    part.SellingPrice = request.SellingPrice;
    part.Quantity = request.Quantity;
    part.LowStockThreshold = request.LowStockThreshold;
    part.Supplier = request.Supplier;
    part.UpdatedAt = DateTimeOffset.UtcNow;
    Audit(db, principal, "update", "inventory-part", id, $"quantity={part.Quantity}");
    await db.SaveChangesAsync();
    return Results.Ok(part);
}).RequireAuthorization(p => p.RequireRole(AppRoles.Owner, AppRoles.Accountant));

api.MapGet("/pickups", async (ClaimsPrincipal principal, AppDbContext db) =>
{
    var userId = UserId(principal);
    var query = db.PickupAssignments.AsNoTracking().AsQueryable();
    if (principal.IsInRole(AppRoles.Driver)) query = query.Where(x => x.DriverId == userId);
    var result = await query.ToListAsync();
    return Results.Ok(result.OrderBy(x => x.ScheduledAt));
}).RequireAuthorization(p => p.RequireRole(AppRoles.Owner, AppRoles.Manager, AppRoles.Receptionist, AppRoles.Driver));

api.MapPost("/pickups", async (PickupAssignment assignment, ClaimsPrincipal principal, AppDbContext db) =>
{
    assignment.Id = Guid.NewGuid();
    assignment.CreatedAt = assignment.UpdatedAt = DateTimeOffset.UtcNow;
    db.PickupAssignments.Add(assignment);
    Audit(db, principal, "assign", "pickup", assignment.Id, assignment.DriverId.ToString());
    await db.SaveChangesAsync();
    return Results.Created($"/api/pickups/{assignment.Id}", assignment);
}).RequireAuthorization(p => p.RequireRole(AppRoles.Owner, AppRoles.Manager, AppRoles.Receptionist));

api.MapPatch("/pickups/{id:guid}/status", async (Guid id, JobStageRequest request, ClaimsPrincipal principal, AppDbContext db) =>
{
    var valid = new[] { "scheduled", "en-route", "at-customer", "picked-up", "at-workshop", "drop-en-route", "delivered", "cash-received" };
    if (!valid.Contains(request.Stage)) return Results.BadRequest(new { error = "Invalid pickup status" });
    var pickup = await db.PickupAssignments.FindAsync(id);
    if (pickup is null) return Results.NotFound();
    if (principal.IsInRole(AppRoles.Driver) && pickup.DriverId != UserId(principal)) return Results.Forbid();
    pickup.Status = request.Stage;
    if (request.Stage == "cash-received") pickup.CashReceived = true;
    pickup.UpdatedAt = DateTimeOffset.UtcNow;
    Audit(db, principal, "change-status", "pickup", id, request.Stage);
    await db.SaveChangesAsync();
    return Results.Ok(pickup);
}).RequireAuthorization(p => p.RequireRole(AppRoles.Owner, AppRoles.Manager, AppRoles.Receptionist, AppRoles.Driver));

api.MapPost("/attendance", async (AttendanceRequest request, ClaimsPrincipal principal, AppDbContext db) =>
{
    var valid = new[] { "login", "lunch-out", "lunch-in", "logout" };
    if (!valid.Contains(request.EventType)) return Results.BadRequest(new { error = "Invalid attendance event" });
    var entry = new AttendanceEntry { UserId = UserId(principal), EventType = request.EventType };
    db.Attendance.Add(entry);
    await db.SaveChangesAsync();
    return Results.Ok(entry);
});
api.MapGet("/attendance/mine", async (ClaimsPrincipal principal, AppDbContext db) =>
{
    var userId = UserId(principal);
    var entries = await db.Attendance.Where(x => x.UserId == userId).ToListAsync();
    return Results.Ok(entries.OrderByDescending(x => x.At).Take(100));
});

api.MapGet("/notifications", async (ClaimsPrincipal principal, AppDbContext db) =>
{
    var userId = UserId(principal);
    var notifications = await db.Notifications.Where(x => x.RecipientId == userId).ToListAsync();
    return Results.Ok(notifications.OrderByDescending(x => x.DueAt).Take(100));
});
api.MapPost("/notifications", async (NotificationRequest request, ClaimsPrincipal principal, AppDbContext db) =>
{
    var notification = new NotificationRecord
    {
        JobId = request.JobId,
        RecipientId = request.RecipientId,
        Channel = request.Channel,
        Message = request.Message,
        DueAt = request.DueAt ?? DateTimeOffset.UtcNow
    };
    db.Notifications.Add(notification);
    Audit(db, principal, "schedule", "notification", notification.Id, notification.Channel);
    await db.SaveChangesAsync();
    return Results.Accepted($"/api/notifications/{notification.Id}", notification);
});

api.MapGet("/reminders", async (ClaimsPrincipal principal, AppDbContext db) =>
{
    var userId = UserId(principal);
    var reminders = await db.Reminders.Where(x => x.RecipientId == userId && !x.Completed).ToListAsync();
    return Results.Ok(reminders.OrderBy(x => x.DueAt));
});

api.MapPost("/reminders", async (Reminder reminder, ClaimsPrincipal principal, AppDbContext db) =>
{
    reminder.Id = Guid.NewGuid();
    reminder.CreatedAt = reminder.UpdatedAt = DateTimeOffset.UtcNow;
    db.Reminders.Add(reminder);
    Audit(db, principal, "schedule", "reminder", reminder.Id, reminder.Kind);
    await db.SaveChangesAsync();
    return Results.Created($"/api/reminders/{reminder.Id}", reminder);
}).RequireAuthorization(p => p.RequireRole(AppRoles.Owner, AppRoles.Manager, AppRoles.Accountant, AppRoles.Crm));

api.MapPatch("/reminders/{id:guid}/complete", async (Guid id, ClaimsPrincipal principal, AppDbContext db) =>
{
    var reminder = await db.Reminders.FindAsync(id);
    if (reminder is null) return Results.NotFound();
    if (reminder.RecipientId != UserId(principal) && !principal.IsInRole(AppRoles.Owner) && !principal.IsInRole(AppRoles.Manager)) return Results.Forbid();
    reminder.Completed = true;
    reminder.UpdatedAt = DateTimeOffset.UtcNow;
    await db.SaveChangesAsync();
    return Results.NoContent();
});

api.MapGet("/invoices", async (ClaimsPrincipal principal, AppDbContext db) =>
{
    var query = db.Invoices.AsNoTracking().AsQueryable();
    if (principal.IsInRole(AppRoles.Customer))
    {
        var userId = UserId(principal);
        var customerIds = db.Customers.Where(x => x.UserId == userId).Select(x => x.Id);
        var jobIds = db.Jobs.Where(x => customerIds.Contains(x.CustomerId)).Select(x => x.Id);
        query = query.Where(x => jobIds.Contains(x.JobId));
    }
    var result = await query.ToListAsync();
    return Results.Ok(result.OrderByDescending(x => x.CreatedAt));
});

api.MapPost("/invoices", async (Invoice invoice, ClaimsPrincipal principal, AppDbContext db) =>
{
    if (invoice.Type is not ("gst" or "general")) return Results.BadRequest(new { error = "Invoice type must be gst or general" });
    invoice.Id = Guid.NewGuid();
    invoice.CreatedAt = invoice.UpdatedAt = DateTimeOffset.UtcNow;
    db.Invoices.Add(invoice);
    Audit(db, principal, "create", "invoice", invoice.Id, invoice.Number);
    await db.SaveChangesAsync();
    return Results.Created($"/api/invoices/{invoice.Id}", invoice);
}).RequireAuthorization(p => p.RequireRole(AppRoles.Owner, AppRoles.Accountant));

api.MapGet("/consents/{jobId:guid}", async (Guid jobId, ClaimsPrincipal principal, AppDbContext db) =>
{
    if (!await CanAccessJob(jobId, principal, db)) return Results.Forbid();
    var consents = await db.Consents.AsNoTracking().Where(x => x.JobId == jobId).ToListAsync();
    return Results.Ok(consents.OrderBy(x => x.SignedAt));
});

api.MapPost("/consents", async (Consent consent, ClaimsPrincipal principal, AppDbContext db) =>
{
    if (!await CanAccessJob(consent.JobId, principal, db)) return Results.Forbid();
    consent.Id = Guid.NewGuid();
    consent.SignedAt = consent.CreatedAt = consent.UpdatedAt = DateTimeOffset.UtcNow;
    db.Consents.Add(consent);
    Audit(db, principal, "sign", "consent", consent.Id, consent.Kind);
    await db.SaveChangesAsync();
    return Results.Created($"/api/consents/{consent.Id}", consent);
});

api.MapGet("/documents", async (Guid? jobId, ClaimsPrincipal principal, AppDbContext db) =>
{
    var query = db.Documents.AsNoTracking().AsQueryable();
    if (jobId.HasValue) query = query.Where(x => x.JobId == jobId);
    if (principal.IsInRole(AppRoles.Customer))
    {
        var userId = UserId(principal);
        var customerIds = db.Customers.Where(x => x.UserId == userId).Select(x => x.Id);
        var jobIds = db.Jobs.Where(x => customerIds.Contains(x.CustomerId)).Select(x => x.Id);
        query = query.Where(x => x.CustomerVisible && ((x.CustomerId.HasValue && customerIds.Contains(x.CustomerId.Value)) || (x.JobId.HasValue && jobIds.Contains(x.JobId.Value))));
    }
    return Results.Ok(await query.Take(200).ToListAsync());
});

api.MapPost("/documents", async (HttpRequest request, ClaimsPrincipal principal, AppDbContext db, IWebHostEnvironment env) =>
{
    if (!request.HasFormContentType) return Results.BadRequest(new { error = "multipart/form-data required" });
    var form = await request.ReadFormAsync();
    var file = form.Files.GetFile("file");
    if (file is null || file.Length == 0) return Results.BadRequest(new { error = "file is required" });
    if (file.Length > 10 * 1024 * 1024) return Results.BadRequest(new { error = "Maximum file size is 10 MB" });
    var allowed = new[] { ".pdf", ".jpg", ".jpeg", ".png", ".webp" };
    var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
    if (!allowed.Contains(extension)) return Results.BadRequest(new { error = "Unsupported file type" });
    var uploadRoot = Path.Combine(env.ContentRootPath, "wwwroot", "uploads");
    Directory.CreateDirectory(uploadRoot);
    var storageKey = $"{Guid.NewGuid():N}{extension}";
    await using (var stream = File.Create(Path.Combine(uploadRoot, storageKey))) await file.CopyToAsync(stream);
    var document = new WorkshopDocument
    {
        Type = form["type"].ToString(),
        FileName = Path.GetFileName(file.FileName),
        StorageKey = $"uploads/{storageKey}",
        CustomerVisible = bool.TryParse(form["customerVisible"], out var visible) && visible,
        UploadedById = UserId(principal),
        JobId = Guid.TryParse(form["jobId"], out var jobId) ? jobId : null,
        VehicleId = Guid.TryParse(form["vehicleId"], out var vehicleId) ? vehicleId : null,
        CustomerId = Guid.TryParse(form["customerId"], out var customerId) ? customerId : null
    };
    db.Documents.Add(document);
    await db.SaveChangesAsync();
    return Results.Created($"/api/documents/{document.Id}", document);
}).DisableAntiforgery();

api.MapGet("/audit", async (AppDbContext db) =>
{
    var events = await db.AuditEvents.AsNoTracking().ToListAsync();
    return Results.Ok(events.OrderByDescending(x => x.CreatedAt).Take(500));
})
    .RequireAuthorization(p => p.RequireRole(AppRoles.Owner));

app.Run();

static Guid UserId(ClaimsPrincipal principal) => Guid.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);
static Guid OrganizationId(ClaimsPrincipal principal) => Guid.Parse(principal.FindFirstValue("organization_id")!);
static UserView ToView(UserAccount user) => new(user.Id, user.OrganizationId, user.Name, user.Email, user.Phone, user.Role, user.PhotoUrl, user.DrivingLicensePhotoUrl);
static async Task<bool> CanAccessJob(Guid jobId, ClaimsPrincipal principal, AppDbContext db)
{
    if (!principal.IsInRole(AppRoles.Customer)) return true;
    var userId = UserId(principal);
    return await db.Jobs.AnyAsync(job => job.Id == jobId && db.Customers.Any(customer => customer.Id == job.CustomerId && customer.UserId == userId));
}
static void Audit(AppDbContext db, ClaimsPrincipal principal, string action, string entityType, Guid entityId, string detail) =>
    db.AuditEvents.Add(new AuditEvent
    {
        ActorId = UserId(principal), Action = action, EntityType = entityType, EntityId = entityId.ToString(),
        DetailsJson = JsonSerializer.Serialize(new { detail })
    });
