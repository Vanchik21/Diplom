using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Physis.Api.Migrations
{
    public partial class AddPredictionsJson : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PredictionsJson",
                table: "SavedScenarios",
                type: "text",
                nullable: false,
                defaultValue: "{}");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PredictionsJson",
                table: "SavedScenarios");
        }
    }
}
