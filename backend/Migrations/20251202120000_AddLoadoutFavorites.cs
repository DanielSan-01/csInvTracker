using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddLoadoutFavorites : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LoadoutFavorites",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoadoutFavorites", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LoadoutFavorites_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LoadoutFavoriteEntries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    LoadoutFavoriteId = table.Column<Guid>(type: "uuid", nullable: false),
                    SlotKey = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Team = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    InventoryItemId = table.Column<int>(type: "integer", nullable: true),
                    SkinId = table.Column<int>(type: "integer", nullable: true),
                    SkinName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ImageUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Weapon = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoadoutFavoriteEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LoadoutFavoriteEntries_InventoryItems_InventoryItemId",
                        column: x => x.InventoryItemId,
                        principalTable: "InventoryItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_LoadoutFavoriteEntries_LoadoutFavorites_LoadoutFavoriteId",
                        column: x => x.LoadoutFavoriteId,
                        principalTable: "LoadoutFavorites",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LoadoutFavoriteEntries_Skins_SkinId",
                        column: x => x.SkinId,
                        principalTable: "Skins",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LoadoutFavoriteEntries_InventoryItemId",
                table: "LoadoutFavoriteEntries",
                column: "InventoryItemId");

            migrationBuilder.CreateIndex(
                name: "IX_LoadoutFavoriteEntries_LoadoutFavoriteId",
                table: "LoadoutFavoriteEntries",
                column: "LoadoutFavoriteId");

            migrationBuilder.CreateIndex(
                name: "IX_LoadoutFavoriteEntries_SkinId",
                table: "LoadoutFavoriteEntries",
                column: "SkinId");

            migrationBuilder.CreateIndex(
                name: "IX_LoadoutFavorites_UserId",
                table: "LoadoutFavorites",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LoadoutFavoriteEntries");

            migrationBuilder.DropTable(
                name: "LoadoutFavorites");
        }
    }
}




