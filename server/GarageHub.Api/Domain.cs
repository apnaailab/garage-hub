namespace GarageHub.Api;

public static class AppRoles
{
    public const string ProtectedAdminEmail = "apnaailab@gmail.com";
    public const string Admin = "admin";
    public const string Owner = "owner";
    public const string Manager = "manager";
    public const string Driver = "driver";
    public const string Mechanic = "mechanic";
    public const string HeadMechanic = "head-mechanic";
    public const string Accountant = "accountant";
    public const string Washing = "washing";
    public const string WheelAlignment = "wheel-alignment";
    public const string Crm = "crm";
    public const string Customer = "customer";

    public static readonly string[] All =
    [Admin, Owner, Manager, Driver, Mechanic, HeadMechanic, Accountant, Washing, WheelAlignment, Crm, Customer];

    public const string Leadership = Admin + "," + Owner + "," + Manager;
    public const string CustomerData = Admin + "," + Owner + "," + Manager + "," + Accountant;
    public const string Workshop = Admin + "," + Owner + "," + Manager + "," + Accountant + "," + Mechanic + "," + HeadMechanic;
}

public abstract class Entity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class Organization : Entity
{
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public string? LogoStorageKey { get; set; }
    public bool IsArchived { get; set; }
}

public sealed class UserAccount : Entity
{
    public Guid OrganizationId { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public required string Phone { get; set; }
    public required string Role { get; set; }
    public required string PasswordHash { get; set; }
    public bool Active { get; set; } = true;
    public string? PhotoUrl { get; set; }
    public string? DrivingLicensePhotoUrl { get; set; }
}

public sealed class WorkflowSnapshot : Entity
{
    public Guid OrganizationId { get; set; }
    public long Version { get; set; }
    public required string DataJson { get; set; }
    public Guid UpdatedById { get; set; }
}

public sealed class PortalSnapshot : Entity
{
    public Guid OrganizationId { get; set; }
    public long Version { get; set; }
    public required string DataJson { get; set; }
    public Guid UpdatedById { get; set; }
}

public sealed class CustomerProfile : Entity
{
    public Guid OrganizationId { get; set; }
    public Guid? UserId { get; set; }
    public required string Name { get; set; }
    public required string Phone { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public DateOnly? Anniversary { get; set; }
    public string? ReferralSource { get; set; }
    public string? ReferralName { get; set; }
    public string? ReferralPhone { get; set; }
    public int RewardPoints { get; set; }
}

public sealed class Vehicle : Entity
{
    public Guid OrganizationId { get; set; }
    public Guid CustomerId { get; set; }
    public required string RegistrationNumber { get; set; }
    public required string Make { get; set; }
    public required string Model { get; set; }
    public string? Variant { get; set; }
    public int Year { get; set; }
    public string? Colour { get; set; }
    public string? ChassisNumber { get; set; }
    public string? EngineNumber { get; set; }
    public DateOnly? RegistrationDate { get; set; }
    public string? ManufacturingMonthYear { get; set; }
    public int AverageMonthlyKm { get; set; }
    public string? InsuranceType { get; set; }
    public DateOnly? InsuranceExpiry { get; set; }
    public DateOnly? PucExpiry { get; set; }
    public string? TireDetails { get; set; }
    public string? BatteryDetails { get; set; }
    public bool Active { get; set; } = true;
}

public sealed class Job : Entity
{
    public Guid OrganizationId { get; set; }
    public required string Number { get; set; }
    public Guid CustomerId { get; set; }
    public Guid VehicleId { get; set; }
    public required string IntakeMode { get; set; }
    public required string Stage { get; set; } = "pending-for-pickup";
    public required string CustomerVoiceJson { get; set; } = "[]";
    public required string AccessoriesJson { get; set; } = "[]";
    public required string DamageJson { get; set; } = "[]";
    public required string ServicesJson { get; set; } = "[]";
    public string FuelLevel { get; set; } = "1/2";
    public int Odometer { get; set; }
    public Guid? AssignedTechnicianId { get; set; }
    public DateTimeOffset? EstimateDueAt { get; set; }
    public DateTimeOffset? EstimatedDeliveryAt { get; set; }
    public bool OwnerEstimateApproved { get; set; }
    public bool CustomerEstimateApproved { get; set; }
    public bool WorkshopClosed { get; set; }
    public bool Paid { get; set; }
    public bool GatePassIssued { get; set; }
}

public sealed class WorkshopDocument : Entity
{
    public Guid OrganizationId { get; set; }
    public Guid? CustomerId { get; set; }
    public Guid? VehicleId { get; set; }
    public Guid? JobId { get; set; }
    public required string Type { get; set; }
    public required string FileName { get; set; }
    public required string StorageKey { get; set; }
    public bool CustomerVisible { get; set; }
    public Guid UploadedById { get; set; }
}

public sealed class Consent : Entity
{
    public Guid OrganizationId { get; set; }
    public Guid JobId { get; set; }
    public required string Kind { get; set; }
    public required string Language { get; set; }
    public required string ContentVersion { get; set; }
    public required string SignerName { get; set; }
    public required string SignatureData { get; set; }
    public DateTimeOffset SignedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class PickupAssignment : Entity
{
    public Guid OrganizationId { get; set; }
    public Guid JobId { get; set; }
    public Guid DriverId { get; set; }
    public required string Type { get; set; }
    public required string Address { get; set; }
    public required string CustomerPhone { get; set; }
    public DateTimeOffset ScheduledAt { get; set; }
    public string Status { get; set; } = "scheduled";
    public int? DriverEtaMinutes { get; set; }
    public bool CashToCollect { get; set; }
    public bool CashReceived { get; set; }
}

public sealed class InventoryPart : Entity
{
    public Guid OrganizationId { get; set; }
    public required string Sku { get; set; }
    public required string Name { get; set; }
    public decimal UnitCost { get; set; }
    public decimal SellingPrice { get; set; }
    public int Quantity { get; set; }
    public int LowStockThreshold { get; set; } = 5;
    public string? Supplier { get; set; }
}

public sealed class AttendanceEntry : Entity
{
    public Guid OrganizationId { get; set; }
    public Guid UserId { get; set; }
    public required string EventType { get; set; }
    public DateTimeOffset At { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class Invoice : Entity
{
    public Guid OrganizationId { get; set; }
    public Guid JobId { get; set; }
    public required string Number { get; set; }
    public required string Type { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
    public decimal EstimatedTotal { get; set; }
    public string Status { get; set; } = "draft";
    public string? PaymentMode { get; set; }
}

public sealed class NotificationRecord : Entity
{
    public Guid OrganizationId { get; set; }
    public Guid? JobId { get; set; }
    public Guid RecipientId { get; set; }
    public required string Channel { get; set; }
    public required string Message { get; set; }
    public DateTimeOffset DueAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? SentAt { get; set; }
    public DateTimeOffset? ReadAt { get; set; }
    public string Status { get; set; } = "pending";
}

public sealed class Reminder : Entity
{
    public Guid OrganizationId { get; set; }
    public Guid? JobId { get; set; }
    public Guid RecipientId { get; set; }
    public required string Kind { get; set; }
    public required string Message { get; set; }
    public DateTimeOffset DueAt { get; set; }
    public int RepeatMinutes { get; set; }
    public bool Completed { get; set; }
}

public sealed class AuditEvent : Entity
{
    public Guid OrganizationId { get; set; }
    public Guid ActorId { get; set; }
    public required string Action { get; set; }
    public required string EntityType { get; set; }
    public required string EntityId { get; set; }
    public required string DetailsJson { get; set; } = "{}";
}

public record LoginRequest(string Email, string Password);
public record CreateUserRequest(string Name, string Email, string Phone, string Role, string Password, Guid? OrganizationId);
public record CreateOrganizationRequest(string Name);
public record UpdateOrganizationRequest(string Name);
public record SetOrganizationArchivedRequest(bool Archived);
public record UpdateUserRequest(string Name, string Email, string Phone, string Role);
public record SetUserActiveRequest(bool Active);
public record SetUserPasswordRequest(string Password);
public record LoginResponse(string Token, UserView User);
public record UserView(Guid Id, Guid OrganizationId, string Name, string Email, string Phone, string Role, bool Active, string? PhotoUrl, string? DrivingLicensePhotoUrl);
public record OrganizationIdentityView(Guid Id, string Name, string? LogoUrl);
public record OrganizationView(Guid Id, string Name, string Slug, int OwnerCount, int ActiveUserCount, bool Archived, string? LogoUrl);
public record WorkflowStateRequest(long BaseVersion, System.Text.Json.JsonElement Data);
public record WorkflowStateResponse(long Version, System.Text.Json.JsonElement Data, DateTimeOffset UpdatedAt, Guid UpdatedById);
public record AttendanceRequest(string EventType);
public record JobStageRequest(string Stage);
public record EstimateActionRequest(string Action, string? SelectedItemsJson);
public record NotificationRequest(Guid RecipientId, Guid? JobId, string Channel, string Message, DateTimeOffset? DueAt);
