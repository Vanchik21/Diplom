using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Physis.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAssignmentTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AssignmentType",
                table: "Assignments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Questions",
                table: "Assignments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QuizAnswers",
                table: "Submissions",
                type: "text",
                nullable: true);

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AssignmentType",
                table: "Assignments");

            migrationBuilder.DropColumn(
                name: "Questions",
                table: "Assignments");

            migrationBuilder.DropColumn(
                name: "QuizAnswers",
                table: "Submissions");
        }
    }
}
