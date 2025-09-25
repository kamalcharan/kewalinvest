// src/data/mock/mockPortfolioData.ts

export interface PortfolioData {
  customerId: number;
  summary: {
    totalValue: number;
    totalInvested: number;
    dayChange: {
      amount: number;
      percentage: number;
    };
    overallReturns: {
      amount: number;
      percentage: number;
      xirr: number;
    };
  };
  allocation: {
    equity: { value: number; percentage: number; };
    debt: { value: number; percentage: number; };
    hybrid: { value: number; percentage: number; };
    liquid: { value: number; percentage: number; };
  };
  riskProfile: 'Conservative' | 'Moderate' | 'Aggressive';
  riskScore: number; // 1-10
  topHoldings: Array<{
    fundName: string;
    value: number;
    returns: number;
    allocation: number;
  }>;
  performanceHistory: number[]; // Last 12 months
  lastTransaction: {
    date: string;
    type: 'BUY' | 'SELL' | 'SIP';
    amount: number;
    fundName: string;
  };
}

export const mockPortfolioData: Record<number, PortfolioData> = {
  1: {
    customerId: 1,
    summary: {
      totalValue: 2847500,
      totalInvested: 2500000,
      dayChange: {
        amount: 12500,
        percentage: 0.44
      },
      overallReturns: {
        amount: 347500,
        percentage: 13.9,
        xirr: 11.2
      }
    },
    allocation: {
      equity: { value: 1850875, percentage: 65 },
      debt: { value: 711875, percentage: 25 },
      hybrid: { value: 284750, percentage: 10 },
      liquid: { value: 0, percentage: 0 }
    },
    riskProfile: 'Moderate',
    riskScore: 6.5,
    topHoldings: [
      { fundName: 'HDFC Top 100 Fund', value: 850000, returns: 15.2, allocation: 29.9 },
      { fundName: 'ICICI Pru Corporate Bond', value: 625000, returns: 7.8, allocation: 22.0 },
      { fundName: 'SBI Balanced Advantage', value: 425000, returns: 12.5, allocation: 14.9 },
      { fundName: 'Axis Bluechip Fund', value: 380000, returns: 18.3, allocation: 13.3 }
    ],
    performanceHistory: [100, 102, 101, 105, 108, 107, 112, 115, 113, 119, 122, 125],
    lastTransaction: {
      date: '2024-12-10',
      type: 'SIP',
      amount: 25000,
      fundName: 'HDFC Top 100 Fund'
    }
  },
  2: {
    customerId: 2,
    summary: {
      totalValue: 1575000,
      totalInvested: 1800000,
      dayChange: {
        amount: -8500,
        percentage: -0.54
      },
      overallReturns: {
        amount: -225000,
        percentage: -12.5,
        xirr: -8.3
      }
    },
    allocation: {
      equity: { value: 1102500, percentage: 70 },
      debt: { value: 315000, percentage: 20 },
      hybrid: { value: 157500, percentage: 10 },
      liquid: { value: 0, percentage: 0 }
    },
    riskProfile: 'Aggressive',
    riskScore: 8.2,
    topHoldings: [
      { fundName: 'Quant Small Cap Fund', value: 450000, returns: -18.5, allocation: 28.6 },
      { fundName: 'Nippon India Growth', value: 380000, returns: -8.2, allocation: 24.1 },
      { fundName: 'Franklin Debt Fund', value: 315000, returns: 6.5, allocation: 20.0 },
      { fundName: 'DSP Midcap Fund', value: 280000, returns: -15.3, allocation: 17.8 }
    ],
    performanceHistory: [100, 98, 95, 97, 92, 89, 91, 88, 85, 87, 88, 87.5],
    lastTransaction: {
      date: '2024-12-05',
      type: 'SELL',
      amount: 50000,
      fundName: 'Quant Small Cap Fund'
    }
  },
  3: {
    customerId: 3,
    summary: {
      totalValue: 5250000,
      totalInvested: 4200000,
      dayChange: {
        amount: 28500,
        percentage: 0.55
      },
      overallReturns: {
        amount: 1050000,
        percentage: 25.0,
        xirr: 18.5
      }
    },
    allocation: {
      equity: { value: 2625000, percentage: 50 },
      debt: { value: 1575000, percentage: 30 },
      hybrid: { value: 525000, percentage: 10 },
      liquid: { value: 525000, percentage: 10 }
    },
    riskProfile: 'Conservative',
    riskScore: 4.5,
    topHoldings: [
      { fundName: 'HDFC Corporate Bond', value: 1050000, returns: 8.2, allocation: 20.0 },
      { fundName: 'ICICI Pru Liquid Fund', value: 525000, returns: 6.5, allocation: 10.0 },
      { fundName: 'Mirae Asset Large Cap', value: 890000, returns: 22.8, allocation: 17.0 },
      { fundName: 'Kotak Equity Arbitrage', value: 525000, returns: 7.1, allocation: 10.0 }
    ],
    performanceHistory: [100, 103, 105, 108, 110, 112, 115, 118, 117, 121, 123, 125],
    lastTransaction: {
      date: '2024-12-12',
      type: 'BUY',
      amount: 100000,
      fundName: 'HDFC Corporate Bond'
    }
  },
  4: {
    customerId: 4,
    summary: {
      totalValue: 875000,
      totalInvested: 750000,
      dayChange: {
        amount: 3200,
        percentage: 0.37
      },
      overallReturns: {
        amount: 125000,
        percentage: 16.7,
        xirr: 14.2
      }
    },
    allocation: {
      equity: { value: 656250, percentage: 75 },
      debt: { value: 131250, percentage: 15 },
      hybrid: { value: 87500, percentage: 10 },
      liquid: { value: 0, percentage: 0 }
    },
    riskProfile: 'Aggressive',
    riskScore: 7.8,
    topHoldings: [
      { fundName: 'Axis Midcap Fund', value: 350000, returns: 24.5, allocation: 40.0 },
      { fundName: 'SBI Small Cap Fund', value: 262500, returns: 28.3, allocation: 30.0 },
      { fundName: 'ICICI Pru Credit Risk', value: 131250, returns: 8.9, allocation: 15.0 }
    ],
    performanceHistory: [100, 105, 108, 112, 110, 115, 118, 120, 116, 119, 115, 116.7],
    lastTransaction: {
      date: '2024-12-08',
      type: 'SIP',
      amount: 15000,
      fundName: 'Axis Midcap Fund'
    }
  },
  5: {
    customerId: 5,
    summary: {
      totalValue: 3850000,
      totalInvested: 3200000,
      dayChange: {
        amount: 18900,
        percentage: 0.49
      },
      overallReturns: {
        amount: 650000,
        percentage: 20.3,
        xirr: 15.8
      }
    },
    allocation: {
      equity: { value: 2310000, percentage: 60 },
      debt: { value: 1155000, percentage: 30 },
      hybrid: { value: 385000, percentage: 10 },
      liquid: { value: 0, percentage: 0 }
    },
    riskProfile: 'Moderate',
    riskScore: 6.0,
    topHoldings: [
      { fundName: 'UTI Nifty Index Fund', value: 1155000, returns: 18.5, allocation: 30.0 },
      { fundName: 'SBI Corporate Bond', value: 770000, returns: 7.8, allocation: 20.0 },
      { fundName: 'HDFC Balanced Advantage', value: 385000, returns: 14.2, allocation: 10.0 },
      { fundName: 'Parag Parikh Flexi Cap', value: 850000, returns: 26.7, allocation: 22.1 }
    ],
    performanceHistory: [100, 104, 106, 109, 112, 111, 115, 117, 116, 118, 119, 120.3],
    lastTransaction: {
      date: '2024-12-11',
      type: 'SIP',
      amount: 30000,
      fundName: 'Parag Parikh Flexi Cap'
    }
  }
};

// Generate mock data for remaining customers (6-20) with variations
for (let i = 6; i <= 20; i++) {
  const isPositive = Math.random() > 0.3; // 70% chance of positive returns
  const investedAmount = Math.floor(Math.random() * 4000000) + 500000;
  const returnsPercentage = isPositive 
    ? Math.random() * 30 - 5  // -5% to +25%
    : -(Math.random() * 15);   // -15% to 0%
  
  const currentValue = investedAmount * (1 + returnsPercentage / 100);
  const dayChangePercent = (Math.random() - 0.5) * 2; // -1% to +1%
  
  mockPortfolioData[i] = {
    customerId: i,
    summary: {
      totalValue: Math.floor(currentValue),
      totalInvested: investedAmount,
      dayChange: {
        amount: Math.floor(currentValue * dayChangePercent / 100),
        percentage: Number(dayChangePercent.toFixed(2))
      },
      overallReturns: {
        amount: Math.floor(currentValue - investedAmount),
        percentage: Number(returnsPercentage.toFixed(1)),
        xirr: Number((returnsPercentage * 0.8).toFixed(1))
      }
    },
    allocation: {
      equity: { value: currentValue * 0.6, percentage: 60 },
      debt: { value: currentValue * 0.25, percentage: 25 },
      hybrid: { value: currentValue * 0.1, percentage: 10 },
      liquid: { value: currentValue * 0.05, percentage: 5 }
    },
    riskProfile: ['Conservative', 'Moderate', 'Aggressive'][Math.floor(Math.random() * 3)] as any,
    riskScore: Number((Math.random() * 9 + 1).toFixed(1)),
    topHoldings: [
      { 
        fundName: 'HDFC Top 100 Fund', 
        value: currentValue * 0.3, 
        returns: Number((Math.random() * 30 - 5).toFixed(1)), 
        allocation: 30 
      },
      { 
        fundName: 'ICICI Pru Corporate Bond', 
        value: currentValue * 0.2, 
        returns: Number((Math.random() * 10 + 5).toFixed(1)), 
        allocation: 20 
      },
      { 
        fundName: 'SBI Balanced Advantage', 
        value: currentValue * 0.15, 
        returns: Number((Math.random() * 20).toFixed(1)), 
        allocation: 15 
      }
    ],
    performanceHistory: Array.from({length: 12}, (_, i) => 100 + (returnsPercentage/12 * i)),
    lastTransaction: {
      date: `2024-12-${Math.floor(Math.random() * 12) + 1}`,
      type: ['BUY', 'SELL', 'SIP'][Math.floor(Math.random() * 3)] as any,
      amount: Math.floor(Math.random() * 50000) + 10000,
      fundName: 'HDFC Top 100 Fund'
    }
  };
}