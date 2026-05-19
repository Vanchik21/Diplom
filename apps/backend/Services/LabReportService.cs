using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Physis.Api.Data;
using Physis.Api.Models;

namespace Physis.Api.Services;

public class LabReportService(AppDbContext db)
{
    private static readonly JsonSerializerOptions JsonOpts =
        new() { PropertyNameCaseInsensitive = true };

    public async Task<byte[]?> GenerateAsync(Guid submissionId, string requestUserId)
    {
        var submission = await db.Submissions
            .Include(s => s.Student)
            .Include(s => s.Artifact)
            .Include(s => s.Assignment)
                .ThenInclude(a => a.Classroom)
            .FirstOrDefaultAsync(s => s.Id == submissionId);

        if (submission is null) return null;

        var isOwner   = submission.StudentId == requestUserId;
        var isTeacher = await db.ClassroomMemberships.AnyAsync(m =>
            m.ClassroomId == submission.Assignment.ClassroomId
            && m.UserId   == requestUserId
            && m.Role     == ClassroomRole.Teacher);

        if (!isOwner && !isTeacher) return null;

        var gradingRows = ParseRows(submission.GradingRows);
        var moduleEntry = ModuleCatalog.Entries
            .FirstOrDefault(e => e.Id == submission.Assignment.ModuleId);
        var moduleName = moduleEntry?.NameUk ?? submission.Assignment.ModuleId;

        var studentName = $"{submission.Student.FirstName} {submission.Student.LastName}".Trim() is
            { Length: > 0 } n ? n : submission.Student.UserName ?? submission.StudentId;

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.DefaultTextStyle(t => t.FontSize(11).FontFamily("Arial"));

                page.Header().Column(col =>
                {
                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Text("Physis™")
                            .FontSize(22).Bold();
                        row.ConstantItem(200).AlignRight()
                            .Text(submission.SubmittedAt.ToString("dd.MM.yyyy"))
                            .FontColor(Colors.Grey.Medium);
                    });
                    col.Item().Text("Звіт про виконання лабораторної роботи")
                        .FontSize(13).FontColor(Colors.Grey.Darken2);
                    col.Item().PaddingTop(4).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                });

                page.Content().PaddingTop(16).Column(col =>
                {
                    // Meta
                    col.Item().Table(t =>
                    {
                        t.ColumnsDefinition(c => { c.RelativeColumn(3); c.RelativeColumn(5); });
                        MetaRow(t, "Модуль",   moduleName);
                        MetaRow(t, "Студент",  studentName);
                        MetaRow(t, "Клас",     submission.Assignment.Classroom.Name);
                        MetaRow(t, "Завдання", submission.Assignment.Title);
                    });

                    // Description
                    if (!string.IsNullOrWhiteSpace(submission.Assignment.Description))
                    {
                        col.Item().PaddingTop(14).Text("Умова").FontSize(13).Bold();
                        col.Item().PaddingTop(4).Text(submission.Assignment.Description);
                    }

                    // Grading table
                    col.Item().PaddingTop(14).Text("Прогнози студента проти спостережених значень")
                        .FontSize(13).Bold();

                    if (gradingRows.Count > 0)
                    {
                        col.Item().PaddingTop(6).Table(t =>
                        {
                            t.ColumnsDefinition(c =>
                            {
                                c.RelativeColumn(3);
                                c.RelativeColumn(2);
                                c.RelativeColumn(2);
                                c.RelativeColumn(2);
                            });

                            t.Header(h =>
                            {
                                foreach (var label in new[] { "Метрика", "Очікувано", "Отримано", "Відн. похибка" })
                                    h.Cell().Background(Colors.Grey.Lighten3)
                                        .Padding(4).Text(label).Bold();
                            });

                            foreach (var row in gradingRows)
                            {
                                t.Cell().Padding(4).Text(row.Key);
                                t.Cell().Padding(4).Text(row.Expected.ToString("G4"));
                                t.Cell().Padding(4).Text(row.Actual.ToString("G4"));
                                t.Cell().Padding(4)
                                    .Text($"{row.RelError:P1}")
                                    .FontColor(row.RelError < 0.1 ? Colors.Green.Darken2 : Colors.Red.Darken1);
                            }
                        });
                    }
                    else
                    {
                        col.Item().PaddingTop(4).Text("Дані оцінювання відсутні.")
                            .FontColor(Colors.Grey.Medium);
                    }

                    // Score badge
                    col.Item().PaddingTop(10).Row(row =>
                    {
                        row.AutoItem().Text("Загальний бал: ").Bold();
                        row.AutoItem()
                            .Text($"{submission.Score * 100:F0}%")
                            .Bold()
                            .FontColor(submission.Score >= 0.9 ? Colors.Green.Darken2 : Colors.Orange.Darken1);
                    });

                    // Simulation image
                    if (submission.Artifact is { Kind: "screenshot" } art)
                    {
                        col.Item().PaddingTop(14).Text("Скріншот симуляції").FontSize(13).Bold();
                        col.Item().PaddingTop(6).MaxHeight(220).Image(art.Data);
                    }

                    // Conclusion
                    col.Item().PaddingTop(14).Text("Висновок").FontSize(13).Bold();
                    col.Item().PaddingTop(4).Background(Colors.Grey.Lighten4).Padding(8)
                        .Text(string.IsNullOrWhiteSpace(submission.ConclusionText)
                            ? "Висновок не надано."
                            : submission.ConclusionText);
                });

                page.Footer().AlignCenter()
                    .Text(t =>
                    {
                        t.Span("Physis™ · ").FontColor(Colors.Grey.Medium);
                        t.CurrentPageNumber();
                        t.Span(" / ");
                        t.TotalPages();
                    });
            });
        }).GeneratePdf();
    }

    private static void MetaRow(TableDescriptor t, string label, string value)
    {
        t.Cell().Padding(3).Text(label).FontColor(Colors.Grey.Darken2);
        t.Cell().Padding(3).Text(value);
    }

    private static List<GradingRowData> ParseRows(string json)
    {
        try { return JsonSerializer.Deserialize<List<GradingRowData>>(json, JsonOpts) ?? []; }
        catch { return []; }
    }

    private record GradingRowData(
        string Key, double Expected, double Actual, double AbsError, double RelError);
}
