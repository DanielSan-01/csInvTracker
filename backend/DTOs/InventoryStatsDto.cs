namespace backend.DTOs;

public class InventoryStatsDto
{
    public int TotalItems { get; set; }
    public decimal MarketValue { get; set; }
    public decimal AcquisitionCost { get; set; }
    public decimal NetProfit { get; set; }
    public decimal? AverageProfitPercent { get; set; }
}


