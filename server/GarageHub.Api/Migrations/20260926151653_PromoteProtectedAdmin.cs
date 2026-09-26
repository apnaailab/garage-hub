using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GarageHub.Api.Migrations
{
    /// <inheritdoc />
    public partial class PromoteProtectedAdmin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE "Users"
                SET "Role" = 'admin', "Name" = 'System Admin', "UpdatedAt" = CURRENT_TIMESTAMP
                WHERE LOWER("Email") = 'apnaailab@gmail.com' AND "Role" = 'owner';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE "Users"
                SET "Role" = 'owner', "Name" = 'Organization Owner', "UpdatedAt" = CURRENT_TIMESTAMP
                WHERE LOWER("Email") = 'apnaailab@gmail.com' AND "Role" = 'admin';
                """);
        }
    }
}
