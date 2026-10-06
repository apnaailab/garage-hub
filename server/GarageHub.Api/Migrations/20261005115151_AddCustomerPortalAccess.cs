using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GarageHub.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerPortalAccess : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CustomerPortalAccesses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false),
                    JobId = table.Column<string>(type: "text", nullable: false),
                    CustomerId = table.Column<string>(type: "text", nullable: false),
                    PublicId = table.Column<string>(type: "text", nullable: false),
                    PhoneLastFour = table.Column<string>(type: "text", nullable: false),
                    RevokedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastAccessedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerPortalAccesses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CustomerPortalAccesses_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CustomerPortalAccesses_OrganizationId_JobId",
                table: "CustomerPortalAccesses",
                columns: new[] { "OrganizationId", "JobId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CustomerPortalAccesses_PublicId",
                table: "CustomerPortalAccesses",
                column: "PublicId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CustomerPortalAccesses");
        }
    }
}
