class Dice {
    constructor(name, oldDamage, newDamage) {
        this.Name = name;
        this.OldDamage = new DiceDamage(...oldDamage);
        this.NewDamage = new DiceDamage(...newDamage);
    }
}

// With Mod Classes
export class D4DiceWithMod extends Dice {
    constructor() {
        super("D4 With Mod", [0, 2.5 + 4, 8], [2, 3 + 5, 16]);
    }
}

export class D6DiceWithMod extends Dice {
    constructor() {
        super("D6 With Mod", [0, 3.5 + 4, 10], [3, 4 + 5, 18]);
    }
}

export class D8DiceWithMod extends Dice {
    constructor() {
        super("D8 With Mod", [0, 4.5 + 4, 12], [4, 5 + 5, 20]);
    }
}

export class D10DiceWithMod extends Dice {
    constructor() {
        super("D10 With Mod", [0, 5.5 + 4, 14], [5, 6 + 5, 22]);
    }
}

export class D12DiceWithMod extends Dice {
    constructor() {
        super("D12 With Mod", [0, 6.5 + 4, 16], [6, 7 + 5, 24]);
    }
}

// Without Mod Classes
export class D4Dice extends Dice {
    constructor() {
        super("D4", [0, 2.5, 4], [1, 3, 6]);
    }
}

export class D6Dice extends Dice {
    constructor() {
        super("D6", [0, 3.5, 6], [2, 4, 8]);
    }
}

export class D8Dice extends Dice {
    constructor() {
        super("D8", [0, 4.5, 8], [3, 5, 10]);
    }
}

export class D10Dice extends Dice {
    constructor() {
        super("D10", [0, 5.5, 10], [4, 6, 12]);
    }
}

export class D12Dice extends Dice {
    constructor() {
        super("D12", [0, 6.5, 12], [5, 7, 14]);
    }
}



export class DiceDamage {
    miss = 0;
    hit = 0;
    crit = 0;

    constructor(miss, hit, crit) {
        this.miss = miss;
        this.hit = hit;
        this.crit = crit;
    }
}

export function calculateAverage(diceClass) {
    // Base AC = 14 + Level
    // Assuming Level 1
    // Hit: 55%
    // Crit: 5%
    // Miss: 40%
    var missAvg = diceClass.miss * 0.40;
    var hitAvg = diceClass.hit * 0.55;
    var critAvg = diceClass.crit * 0.05;

    return Math.round((missAvg + hitAvg + critAvg) * 10) / 10;
}

export function logCalculation(diceClass) {
    const oldAverage = calculateAverage(diceClass.OldDamage);
    const newAverage = calculateAverage(diceClass.NewDamage);
    const percentage = Math.floor(newAverage / oldAverage * 100);
    
    console.error(diceClass.Name);
    console.error(`Old Damage Average: ${oldAverage}`);
    console.error(`New Damage Average: ${newAverage}`);
    console.error(`Percentage (%): ${percentage}`)
    console.error(); // Blank line for spacing

    return [oldAverage, newAverage, percentage];
}