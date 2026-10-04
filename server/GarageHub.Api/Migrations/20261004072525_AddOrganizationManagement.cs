using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GarageHub.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizationManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsArchived",
                table: "Organizations",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "LogoStorageKey",
                table: "Organizations",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsArchived",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "LogoStorageKey",
                table: "Organizations");
        }
    }
}
