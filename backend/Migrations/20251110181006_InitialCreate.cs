using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Skins",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Rarity = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Type = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    ImageUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    DefaultPrice = table.Column<decimal>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Skins", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "InventoryItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    SkinId = table.Column<int>(type: "INTEGER", nullable: false),
                    Float = table.Column<double>(type: "REAL", nullable: false),
                    Exterior = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    PaintSeed = table.Column<int>(type: "INTEGER", nullable: true),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Cost = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    ImageUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    TradeProtected = table.Column<bool>(type: "INTEGER", nullable: false),
                    TradableAfter = table.Column<DateTime>(type: "TEXT", nullable: true),
                    AcquiredAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryItems_Skins_SkinId",
                        column: x => x.SkinId,
                        principalTable: "Skins",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "Skins",
                columns: new[] { "Id", "DefaultPrice", "ImageUrl", "Name", "Rarity", "Type" },
                values: new object[,]
                {
                    { 1, 4500m, "https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Sport+Gloves+Pandora", "Sport Gloves | Pandora's Box", "Extraordinary", "Gloves" },
                    { 2, 680m, "https://community.fastly.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Tk5UvzWCL2kpn2-DFk_OKherB0H_qSCXKR09F-teB_Vmfjwkh_smuAzdasdniWaVNzAsYmQuYJ5hTsk4KxP-PhtAGI2opFzin_kGoXufyYXYCg/330x192?allow_animated=1", "Sport Gloves | Nocts", "Extraordinary", "Gloves" },
                    { 3, 700m, "https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Moto+Gloves+Spearmint", "Moto Gloves | Spearmint", "Extraordinary", "Gloves" },
                    { 4, 290m, "https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Specialist+Gloves+Foundation", "Specialist Gloves | Foundation", "Extraordinary", "Gloves" },
                    { 5, 3500m, "https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Butterfly+Doppler", "Butterfly Knife | Doppler (Phase 4)", "Extraordinary", "Knife" },
                    { 6, 1500m, "https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Karambit+Tiger+Tooth", "Karambit | Tiger Tooth", "Extraordinary", "Knife" },
                    { 7, 800m, "https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Butterfly+Black+Laminate", "Butterfly Knife | Black Laminate", "Extraordinary", "Knife" },
                    { 8, 250m, "https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Skeleton+Urban+Masked", "Skeleton Knife | Urban Masked", "Extraordinary", "Knife" },
                    { 9, 80m, "https://via.placeholder.com/300x200/A855F7/FFFFFF?text=Vypa+Sista", "Vypa Sista of the Revolution | Guerrilla Warfare", "Restricted", "Agent" },
                    { 10, 70m, "https://via.placeholder.com/300x200/A855F7/FFFFFF?text=Number+K", "Number K | The Professionals", "Restricted", "Agent" },
                    { 11, 1049m, "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=AK-47+Fire+Serpent", "AK-47 | Fire Serpent", "Covert", "Rifle" },
                    { 12, 100m, "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=M4A4+X-Ray", "M4A4 | X-Ray", "Covert", "Rifle" },
                    { 13, 33m, "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=AK-47+Head+Shot", "AK-47 | Head Shot", "Covert", "Rifle" },
                    { 14, 33m, "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=USP-S+Printstream", "USP-S | Printstream", "Covert", "Pistol" },
                    { 15, 30m, "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=Desert+Eagle+Printstream", "Desert Eagle | Printstream", "Covert", "Pistol" },
                    { 16, 16m, "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=Glock+Gold+Toof", "Glock-18 | Gold Toof", "Covert", "Pistol" },
                    { 17, 115m, "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=MAC-10+Neon+Rider", "MAC-10 | Neon Rider", "Covert", "SMG" },
                    { 18, 3m, "https://via.placeholder.com/300x200/A855F7/FFFFFF?text=MP7+Fade", "MP7 | Fade 99%", "Restricted", "SMG" },
                    { 19, 53m, "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=AWP+Printstream", "AWP | Printstream", "Covert", "Sniper Rifle" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_SkinId",
                table: "InventoryItems",
                column: "SkinId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InventoryItems");

            migrationBuilder.DropTable(
                name: "Skins");
        }
    }
}
