export const calculateFinalRevenue = (investedAmount , actualBoxOffice , basePrice , appliedCard) => {
    const roi = actualBoxOffice / basePrice;
    const baseRevenue = investedAmount * roi;
    const isHit = actualBoxOffice > basePrice;

    if(!appliedCard) return baseRevenue;

    if(isHit){
        const baseProfit = baseRevenue - investedAmount;
        const boostedProfit = baseProfit * appliedCard.multiplier;
        return investedAmount + boostedProfit;
    }else{
        if(appliedCard.isProtection){
            return investedAmount;
        }
        return baseRevenue;
    }
}