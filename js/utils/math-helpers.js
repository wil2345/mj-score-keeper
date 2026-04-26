export function roundScore(value, config, actionType = 'neutral') {
    const precision = config.decimalRounding || 'integer';
    const advantage = config.roundingAdvantage || 'winner';
    
    let direction = 'nearest';
    if (actionType === 'pull') {
        direction = (advantage === 'winner') ? 'up' : 'down';
    } else if (actionType === 'cut') {
        direction = (advantage === 'winner') ? 'down' : 'up';
    }

    let multiplier = 1;
    if (precision === '0.1' || precision === 'none') multiplier = 10;
    else if (precision === '0.5' || precision === 'nearest-0.5') multiplier = 2;
    else if (precision === 'integer') multiplier = 1;

    if (direction === 'up') {
        return Math.ceil(value * multiplier) / multiplier;
    } else if (direction === 'down') {
        return Math.floor(value * multiplier) / multiplier;
    } else {
        return Math.round(value * multiplier) / multiplier;
    }
}
