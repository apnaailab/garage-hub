using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace GarageHub.Api;

public static class Passwords
{
    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 120_000, HashAlgorithmName.SHA256, 32);
        return $"{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    public static bool Verify(string password, string encoded)
    {
        var parts = encoded.Split('.');
        if (parts.Length != 2) return false;
        var salt = Convert.FromBase64String(parts[0]);
        var expected = Convert.FromBase64String(parts[1]);
        var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, 120_000, HashAlgorithmName.SHA256, 32);
        return CryptographicOperations.FixedTimeEquals(actual, expected);
    }
}

public interface IMessageDelivery
{
    Task DeliverAsync(NotificationRecord notification, CancellationToken cancellationToken);
}

public sealed class LocalMessageDelivery(ILogger<LocalMessageDelivery> logger) : IMessageDelivery
{
    public Task DeliverAsync(NotificationRecord notification, CancellationToken cancellationToken)
    {
        logger.LogInformation("LOCAL {Channel} to {RecipientId}: {Message}", notification.Channel, notification.RecipientId, notification.Message);
        return Task.CompletedTask;
    }
}

public sealed class ReminderWorker(IServiceScopeFactory scopeFactory, IMessageDelivery delivery, ILogger<ReminderWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var pendingNotifications = await db.Notifications
                    .Where(x => x.Status == "pending")
                    .ToListAsync(stoppingToken);
                var due = pendingNotifications
                    .Where(x => x.DueAt <= DateTimeOffset.UtcNow)
                    .Take(100)
                    .ToList();
                foreach (var notification in due)
                {
                    await delivery.DeliverAsync(notification, stoppingToken);
                    notification.Status = "sent";
                    notification.SentAt = DateTimeOffset.UtcNow;
                    notification.UpdatedAt = DateTimeOffset.UtcNow;
                }

                var activeReminders = await db.Reminders
                    .Where(x => !x.Completed)
                    .ToListAsync(stoppingToken);
                var reminders = activeReminders
                    .Where(x => x.DueAt <= DateTimeOffset.UtcNow)
                    .Take(100)
                    .ToList();
                foreach (var reminder in reminders)
                {
                    db.Notifications.Add(new NotificationRecord
                    {
                        OrganizationId = reminder.OrganizationId,
                        JobId = reminder.JobId,
                        RecipientId = reminder.RecipientId,
                        Channel = "system",
                        Message = reminder.Message,
                        DueAt = DateTimeOffset.UtcNow
                    });
                    if (reminder.RepeatMinutes > 0) reminder.DueAt = DateTimeOffset.UtcNow.AddMinutes(reminder.RepeatMinutes);
                    else reminder.Completed = true;
                }
                await db.SaveChangesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Reminder processing failed");
            }
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}

public static class SeedData
{
    public static async Task EnsureAsync(AppDbContext db, IConfiguration configuration, IWebHostEnvironment environment)
    {
        if (configuration.GetValue("Database:ApplyMigrations", !environment.IsDevelopment()))
            await db.Database.MigrateAsync();
        else
            await db.Database.EnsureCreatedAsync();

        if (await db.Users.AnyAsync())
        {
            var recoveryPassword = configuration["AdminRecovery:Password"];
            if (!string.IsNullOrWhiteSpace(recoveryPassword))
            {
                if (recoveryPassword.Length < 12)
                    throw new InvalidOperationException("AdminRecovery__Password must contain at least 12 characters.");

                var protectedAdmin = await db.Users.SingleOrDefaultAsync(x => x.Email == AppRoles.ProtectedAdminEmail);
                if (protectedAdmin is null)
                {
                    var organizationId = await db.Organizations.Select(x => x.Id).SingleAsync();
                    protectedAdmin = new UserAccount
                    {
                        OrganizationId = organizationId,
                        Name = "System Admin",
                        Email = AppRoles.ProtectedAdminEmail,
                        Phone = string.Empty,
                        Role = AppRoles.Admin,
                        PasswordHash = Passwords.Hash(recoveryPassword)
                    };
                    db.Users.Add(protectedAdmin);
                }
                else
                {
                    protectedAdmin.Name = "System Admin";
                    protectedAdmin.Role = AppRoles.Admin;
                    protectedAdmin.Active = true;
                    protectedAdmin.PasswordHash = Passwords.Hash(recoveryPassword);
                    protectedAdmin.UpdatedAt = DateTimeOffset.UtcNow;
                }
                await db.SaveChangesAsync();
            }

            var legacyOwner = await db.Users.SingleOrDefaultAsync(x => x.Email == "owner@garagehub.local" && x.Name == "Shree Auto Owner");
            if (legacyOwner is not null)
            {
                legacyOwner.Name = "Garage Owner";
                legacyOwner.UpdatedAt = DateTimeOffset.UtcNow;
                await db.SaveChangesAsync();
            }
            return;
        }

        var useDemoData = configuration.GetValue("Seed:DemoData", environment.IsDevelopment());
        var organizationName = useDemoData
            ? "GarageHub Demo Organization"
            : configuration["Bootstrap:OrganizationName"];
        var ownerEmail = useDemoData ? "owner@garagehub.local" : configuration["Bootstrap:OwnerEmail"];
        var ownerPassword = useDemoData ? "Demo@123" : configuration["Bootstrap:OwnerPassword"];
        if (string.IsNullOrWhiteSpace(organizationName) || string.IsNullOrWhiteSpace(ownerEmail) || string.IsNullOrWhiteSpace(ownerPassword))
            throw new InvalidOperationException("An empty production database requires Bootstrap__OrganizationName, Bootstrap__OwnerEmail and Bootstrap__OwnerPassword.");
        if (!useDemoData && ownerPassword.Length < 8)
            throw new InvalidOperationException("Bootstrap__OwnerPassword must contain at least 8 characters.");

        var organization = new Organization
        {
            Name = organizationName.Trim(),
            Slug = organizationName.Trim().ToLowerInvariant().Replace(' ', '-')
        };
        db.Organizations.Add(organization);

        if (!useDemoData)
        {
            db.Users.Add(new UserAccount
            {
                OrganizationId = organization.Id,
                Name = ownerEmail.Trim().Equals(AppRoles.ProtectedAdminEmail, StringComparison.OrdinalIgnoreCase)
                    ? "System Admin"
                    : "Organization Owner",
                Email = ownerEmail.Trim().ToLowerInvariant(),
                Phone = string.Empty,
                Role = ownerEmail.Trim().Equals(AppRoles.ProtectedAdminEmail, StringComparison.OrdinalIgnoreCase)
                    ? AppRoles.Admin
                    : AppRoles.Owner,
                PasswordHash = Passwords.Hash(ownerPassword)
            });
            await db.SaveChangesAsync();
            return;
        }

        var people = new (string Name, string Role)[]
        {
            ("Garage Owner", AppRoles.Owner),
            ("Workshop Manager", AppRoles.Manager),
            ("Pickup Driver", AppRoles.Driver),
            ("Technician", AppRoles.Mechanic),
            ("Head Mechanic", AppRoles.HeadMechanic),
            ("Accounts Team", AppRoles.Accountant),
            ("Washing Team", AppRoles.Washing),
            ("WA/WB Specialist", AppRoles.WheelAlignment),
            ("CRM Executive", AppRoles.Crm),
            ("Demo Customer", AppRoles.Customer)
        };

        var users = people.Select(x => new UserAccount
        {
            OrganizationId = organization.Id,
            Name = x.Name,
            Email = $"{x.Role}@garagehub.local",
            Phone = "+91 90000 00000",
            Role = x.Role,
            PasswordHash = Passwords.Hash("Demo@123"),
            PhotoUrl = x.Role is AppRoles.Driver ? "/uploads/driver-placeholder.jpg" : null,
            DrivingLicensePhotoUrl = x.Role is AppRoles.Driver ? "/uploads/license-placeholder.jpg" : null
        }).ToList();
        db.Users.AddRange(users);

        var customerUser = users.Single(x => x.Role == AppRoles.Customer);
        var customer = new CustomerProfile
        {
            OrganizationId = organization.Id,
            UserId = customerUser.Id,
            Name = customerUser.Name,
            Phone = customerUser.Phone,
            Email = customerUser.Email,
            Address = "14 Rose Villa, Bandra West, Mumbai",
            DateOfBirth = new DateOnly(1990, 6, 15),
            Anniversary = new DateOnly(2018, 12, 10),
            ReferralSource = "Google"
        };
        db.Customers.Add(customer);

        var vehicle = new Vehicle
        {
            OrganizationId = organization.Id,
            CustomerId = customer.Id,
            RegistrationNumber = "MH01AB1234",
            Make = "Honda",
            Model = "City",
            Variant = "VX",
            Year = 2021,
            Colour = "Pearl White",
            InsuranceType = "comprehensive",
            InsuranceExpiry = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(21)),
            PucExpiry = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(2))
        };
        db.Vehicles.Add(vehicle);

        var job = new Job
        {
            OrganizationId = organization.Id,
            Number = "JC-3001",
            CustomerId = customer.Id,
            VehicleId = vehicle.Id,
            IntakeMode = "existing-pickup",
            Stage = "pending-for-estimate",
            CustomerVoiceJson = JsonSerializer.Serialize(new[] { "General check-up", "Oil change" }),
            AccessoriesJson = "[]",
            DamageJson = "[]",
            ServicesJson = "[]",
            EstimateDueAt = DateTimeOffset.UtcNow.AddHours(2),
            EstimatedDeliveryAt = DateTimeOffset.UtcNow.AddDays(1)
        };
        db.Jobs.Add(job);

        db.InventoryParts.AddRange(
            new InventoryPart { OrganizationId = organization.Id, Sku = "OIL-5W30", Name = "Engine Oil 5W30", Quantity = 12, LowStockThreshold = 5, UnitCost = 420, SellingPrice = 650 },
            new InventoryPart { OrganizationId = organization.Id, Sku = "WIPER-24", Name = "24-inch Wiper Blade", Quantity = 4, LowStockThreshold = 5, UnitCost = 280, SellingPrice = 450 });

        await db.SaveChangesAsync();
    }
}
