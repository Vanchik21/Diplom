using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Physis.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTeacherScore : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "TeacherScore",
                table: "Submissions",
                type: "double precision",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TeacherScore",
                table: "Submissions");
        }
    }
}
