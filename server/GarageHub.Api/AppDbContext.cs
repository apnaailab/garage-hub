using Microsoft.EntityFrameworkCore;

namespace GarageHub.Api;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<UserAccount> Users => Set<UserAccount>();
    public DbSet<WorkflowSnapshot> WorkflowSnapshots => Set<WorkflowSnapshot>();
    public DbSet<PortalSnapshot> PortalSnapshots => Set<PortalSnapshot>();
    public DbSet<CustomerPortalAccess> CustomerPortalAccesses => Set<CustomerPortalAccess>();
    public DbSet<CustomerProfile> Customers => Set<CustomerProfile>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Job> Jobs => Set<Job>();
    public DbSet<WorkshopDocument> Documents => Set<WorkshopDocument>();
    public DbSet<Consent> Consents => Set<Consent>();
    public DbSet<PickupAssignment> PickupAssignments => Set<PickupAssignment>();
    public DbSet<InventoryPart> InventoryParts => Set<InventoryPart>();
    public DbSet<AttendanceEntry> Attendance => Set<AttendanceEntry>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<NotificationRecord> Notifications => Set<NotificationRecord>();
    public DbSet<Reminder> Reminders => Set<Reminder>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Organization>().HasIndex(x => x.Slug).IsUnique();
        modelBuilder.Entity<UserAccount>().HasIndex(x => x.Email).IsUnique();
        modelBuilder.Entity<WorkflowSnapshot>().HasIndex(x => x.OrganizationId).IsUnique();
        modelBuilder.Entity<WorkflowSnapshot>().Property(x => x.Version).IsConcurrencyToken();
        modelBuilder.Entity<PortalSnapshot>().HasIndex(x => x.OrganizationId).IsUnique();
        modelBuilder.Entity<PortalSnapshot>().Property(x => x.Version).IsConcurrencyToken();
        modelBuilder.Entity<CustomerPortalAccess>().HasIndex(x => x.PublicId).IsUnique();
        modelBuilder.Entity<CustomerPortalAccess>().HasIndex(x => new { x.OrganizationId, x.JobId }).IsUnique();
        modelBuilder.Entity<Vehicle>().HasIndex(x => new { x.OrganizationId, x.RegistrationNumber }).IsUnique();
        modelBuilder.Entity<Job>().HasIndex(x => new { x.OrganizationId, x.Number }).IsUnique();
        modelBuilder.Entity<InventoryPart>().HasIndex(x => new { x.OrganizationId, x.Sku }).IsUnique();
        modelBuilder.Entity<Invoice>().HasIndex(x => new { x.OrganizationId, x.Number }).IsUnique();

        var organizationOwnedTypes = new[]
        {
            typeof(UserAccount), typeof(WorkflowSnapshot), typeof(PortalSnapshot), typeof(CustomerPortalAccess), typeof(CustomerProfile),
            typeof(Vehicle), typeof(Job), typeof(WorkshopDocument), typeof(Consent), typeof(PickupAssignment),
            typeof(InventoryPart), typeof(AttendanceEntry), typeof(Invoice), typeof(NotificationRecord),
            typeof(Reminder), typeof(AuditEvent)
        };
        foreach (var entityType in organizationOwnedTypes)
            modelBuilder.Entity(entityType).HasOne(typeof(Organization)).WithMany().HasForeignKey(nameof(UserAccount.OrganizationId)).OnDelete(DeleteBehavior.Restrict);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties().Where(p => p.ClrType == typeof(decimal)))
            {
                property.SetPrecision(18);
                property.SetScale(0);
            }
        }
    }
}
