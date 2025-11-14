using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

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
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Rarity = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Collection = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Weapon = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    DefaultPrice = table.Column<decimal>(type: "numeric", nullable: true),
                    PaintIndex = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Skins", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SteamId = table.Column<string>(type: "text", nullable: false),
                    Username = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastLoginAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "InventoryItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    SkinId = table.Column<int>(type: "integer", nullable: false),
                    Float = table.Column<double>(type: "double precision", nullable: false),
                    Exterior = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PaintSeed = table.Column<int>(type: "integer", nullable: true),
                    Price = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Cost = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    ImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    TradeProtected = table.Column<bool>(type: "boolean", nullable: false),
                    TradableAfter = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AcquiredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
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
                    table.ForeignKey(
                        name: "FK_InventoryItems_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Skins",
                columns: new[] { "Id", "Collection", "DefaultPrice", "ImageUrl", "Name", "PaintIndex", "Rarity", "Type", "Weapon" },
                values: new object[,]
                {
                    { 1, "Bravo", 1049m, "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=AK-47+Fire+Serpent", "AK-47 | Fire Serpent", null, "Covert", "Rifle", "AK-47" },
                    { 2, "Cobblestone", 5000m, "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=AWP+Dragon+Lore", "AWP | Dragon Lore", null, "Covert", "Sniper Rifle", "AWP" },
                    { 3, "Huntsman", 3000m, "https://via.placeholder.com/300x200/F97316/FFFFFF?text=M4A4+Howl", "M4A4 | Howl", null, "Contraband", "Rifle", "M4A4" },
                    { 4, "Dust", 250m, "https://via.placeholder.com/300x200/A855F7/FFFFFF?text=Deagle+Blaze", "Desert Eagle | Blaze", null, "Restricted", "Pistol", "Desert Eagle" },
                    { 5, "Assault", 150m, "https://via.placeholder.com/300x200/A855F7/FFFFFF?text=Glock+Fade", "Glock-18 | Fade", null, "Restricted", "Pistol", "Glock-18" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_SkinId",
                table: "InventoryItems",
                column: "SkinId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_UserId",
                table: "InventoryItems",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_SteamId",
                table: "Users",
                column: "SteamId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InventoryItems");

            migrationBuilder.DropTable(
                name: "Skins");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
