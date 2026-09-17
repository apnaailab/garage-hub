using Microsoft.EntityFrameworkCore;

namespace GarageHub.Api;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<UserAccount> Users => Set<UserAccount>();
    public DbSet<WorkflowSnapshot> WorkflowSnapshots => Set<WorkflowSnapshot>();
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
        modelBuilder.Entity<Vehicle>().HasIndex(x => x.RegistrationNumber).IsUnique();
        modelBuilder.Entity<Job>().HasIndex(x => x.Number).IsUnique();
        modelBuilder.Entity<InventoryPart>().HasIndex(x => x.Sku).IsUnique();
        modelBuilder.Entity<Invoice>().HasIndex(x => x.Number).IsUnique();

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties().Where(p => p.ClrType == typeof(decimal)))
                property.SetPrecision(18);
        }
    }
}
