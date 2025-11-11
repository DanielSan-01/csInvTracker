using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddCollectionAndWeaponFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 11);

            migrationBuilder.DeleteData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 12);

            migrationBuilder.DeleteData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 13);

            migrationBuilder.DeleteData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 14);

            migrationBuilder.DeleteData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 15);

            migrationBuilder.DeleteData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 16);

            migrationBuilder.DeleteData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 17);

            migrationBuilder.DeleteData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 18);

            migrationBuilder.DeleteData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 19);

            migrationBuilder.AddColumn<string>(
                name: "Collection",
                table: "Skins",
                type: "TEXT",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Weapon",
                table: "Skins",
                type: "TEXT",
                maxLength: 100,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Collection", "DefaultPrice", "ImageUrl", "Name", "Rarity", "Type", "Weapon" },
                values: new object[] { "Bravo", 1049m, "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=AK-47+Fire+Serpent", "AK-47 | Fire Serpent", "Covert", "Rifle", "AK-47" });

            migrationBuilder.UpdateData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "Collection", "DefaultPrice", "ImageUrl", "Name", "Rarity", "Type", "Weapon" },
                values: new object[] { "Cobblestone", 5000m, "https://via.placeholder.com/300x200/DC2626/FFFFFF?text=AWP+Dragon+Lore", "AWP | Dragon Lore", "Covert", "Sniper Rifle", "AWP" });

            migrationBuilder.UpdateData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "Collection", "DefaultPrice", "ImageUrl", "Name", "Rarity", "Type", "Weapon" },
                values: new object[] { "Huntsman", 3000m, "https://via.placeholder.com/300x200/F97316/FFFFFF?text=M4A4+Howl", "M4A4 | Howl", "Contraband", "Rifle", "M4A4" });

            migrationBuilder.UpdateData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "Collection", "DefaultPrice", "ImageUrl", "Name", "Rarity", "Type", "Weapon" },
                values: new object[] { "Dust", 250m, "https://via.placeholder.com/300x200/A855F7/FFFFFF?text=Deagle+Blaze", "Desert Eagle | Blaze", "Restricted", "Pistol", "Desert Eagle" });

            migrationBuilder.UpdateData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "Collection", "DefaultPrice", "ImageUrl", "Name", "Rarity", "Type", "Weapon" },
                values: new object[] { "Assault", 150m, "https://via.placeholder.com/300x200/A855F7/FFFFFF?text=Glock+Fade", "Glock-18 | Fade", "Restricted", "Pistol", "Glock-18" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Collection",
                table: "Skins");

            migrationBuilder.DropColumn(
                name: "Weapon",
                table: "Skins");

            migrationBuilder.UpdateData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "DefaultPrice", "ImageUrl", "Name", "Rarity", "Type" },
                values: new object[] { 4500m, "https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Sport+Gloves+Pandora", "Sport Gloves | Pandora's Box", "Extraordinary", "Gloves" });

            migrationBuilder.UpdateData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "DefaultPrice", "ImageUrl", "Name", "Rarity", "Type" },
                values: new object[] { 680m, "https://community.fastly.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu5Tk5UvzWCL2kpn2-DFk_OKherB0H_qSCXKR09F-teB_Vmfjwkh_smuAzdasdniWaVNzAsYmQuYJ5hTsk4KxP-PhtAGI2opFzin_kGoXufyYXYCg/330x192?allow_animated=1", "Sport Gloves | Nocts", "Extraordinary", "Gloves" });

            migrationBuilder.UpdateData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "DefaultPrice", "ImageUrl", "Name", "Rarity", "Type" },
                values: new object[] { 700m, "https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Moto+Gloves+Spearmint", "Moto Gloves | Spearmint", "Extraordinary", "Gloves" });

            migrationBuilder.UpdateData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "DefaultPrice", "ImageUrl", "Name", "Rarity", "Type" },
                values: new object[] { 290m, "https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Specialist+Gloves+Foundation", "Specialist Gloves | Foundation", "Extraordinary", "Gloves" });

            migrationBuilder.UpdateData(
                table: "Skins",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "DefaultPrice", "ImageUrl", "Name", "Rarity", "Type" },
                values: new object[] { 3500m, "https://via.placeholder.com/300x200/EAB308/FFFFFF?text=Butterfly+Doppler", "Butterfly Knife | Doppler (Phase 4)", "Extraordinary", "Knife" });

            migrationBuilder.InsertData(
                table: "Skins",
                columns: new[] { "Id", "DefaultPrice", "ImageUrl", "Name", "Rarity", "Type" },
                values: new object[,]
                {
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
        }
    }
}
