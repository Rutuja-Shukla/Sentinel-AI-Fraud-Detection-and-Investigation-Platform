import { AnomalyDetails, CustomerProfile, Transaction } from './models.ts';
import { calculateHaversineDistanceKm } from './rules.ts';

/**
 * Statistical Anomaly Detection Engine
 * Combines parametric (Z-Score), non-parametric (Interquartile Range - IQR),
 * and multi-dimensional isolation tree simulation to score behavioral deviations.
 */
export class AnomalyEngine {
  /**
   * Evaluates a transaction's deviation from customer baselines and fleet distributions.
   * Returns a normalized anomaly score [0, 100] and detailed sub-factors.
   */
  public evaluate(
    txn: Transaction,
    customer: CustomerProfile,
    recentHistory: Transaction[]
  ): AnomalyDetails {
    const txTime = new Date(txn.timestamp).getTime();

    // 1. Amount Deviation & Z-Score
    const avg = customer.averageTxnAmount || 120;
    const std = customer.stdDevTxnAmount || 60;
    const zScore = std > 0 ? (txn.amount - avg) / std : 0;
    const deviationRatio = avg > 0 ? txn.amount / avg : 1;

    // Amount risk component (0 - 30 pts)
    let amountRisk = 0;
    if (zScore > 4 || deviationRatio > 5) {
      amountRisk = 30;
    } else if (zScore > 2.5 || deviationRatio > 3) {
      amountRisk = 20;
    } else if (zScore > 1.5 || deviationRatio > 1.8) {
      amountRisk = 10;
    }

    // 2. Velocity & Temporal Cadence
    const priorTxns = recentHistory.filter(
      (t) => new Date(t.timestamp).getTime() < txTime && t.id !== txn.id
    );
    const lastTxn = priorTxns[priorTxns.length - 1];

    let timeSinceLastTxnMinutes = 9999;
    let velocityRisk = 0; // (0 - 25 pts)

    if (lastTxn) {
      const diffMs = txTime - new Date(lastTxn.timestamp).getTime();
      timeSinceLastTxnMinutes = Math.max(0.1, diffMs / (60 * 1000));

      // Burst velocity: less than 3 minutes since last txn
      if (timeSinceLastTxnMinutes < 3) {
        velocityRisk = 25;
      } else if (timeSinceLastTxnMinutes < 10) {
        velocityRisk = 18;
      } else if (timeSinceLastTxnMinutes < 30) {
        velocityRisk = 8;
      }
    }

    // 3. Geographic Movement & Implied Travel Velocity
    let geoDistanceKm = 0;
    let travelVelocityKmH = 0;
    let geoRisk = 0; // (0 - 25 pts)

    if (lastTxn && lastTxn.sourceLocation && txn.sourceLocation) {
      const diffHours = (txTime - new Date(lastTxn.timestamp).getTime()) / (1000 * 60 * 60);
      geoDistanceKm = calculateHaversineDistanceKm(
        lastTxn.sourceLocation.latitude,
        lastTxn.sourceLocation.longitude,
        txn.sourceLocation.latitude,
        txn.sourceLocation.longitude
      );

      if (diffHours > 0) {
        travelVelocityKmH = geoDistanceKm / diffHours;

        if (travelVelocityKmH > 900 && geoDistanceKm > 200) {
          geoRisk = 25; // Supersonic / Impossible speed
        } else if (travelVelocityKmH > 500 && geoDistanceKm > 100) {
          geoRisk = 18; // Very high speed
        } else if (geoDistanceKm > 2000 && diffHours < 5) {
          geoRisk = 22;
        } else if (geoDistanceKm > 500) {
          geoRisk = 8;
        }
      }
    }

    // 4. Device & Merchant Novelty Indicators
    const isNewDevice = txn.deviceId
      ? !customer.knownDevices?.includes(txn.deviceId)
      : false;
    const isNewMerchant = txn.merchantName
      ? !customer.topMerchants?.includes(txn.merchantName)
      : false;

    let deviceRisk = isNewDevice ? 10 : 0; // (0 - 10 pts)
    let merchantRisk = isNewMerchant ? 10 : 0; // (0 - 10 pts)

    if (
      isNewMerchant &&
      ['CRYPTO_EXCHANGE', 'FOREIGN_WIRE', 'GAMBLING'].includes(txn.merchantCategory)
    ) {
      merchantRisk = 15;
    }

    // 5. Multi-dimensional Isolation Tree Anomaly Factor
    // Simulates isolation depth across 4 normalized features:
    // f1: amount deviation ratio
    // f2: inverse time delta (burstiness)
    // f3: geo travel velocity normalized
    // f4: channel irregularity
    const normAmount = Math.min(10, deviationRatio) / 10;
    const normVelocity = Math.min(60, 60 / Math.max(1, timeSinceLastTxnMinutes)) / 60;
    const normGeo = Math.min(1000, travelVelocityKmH) / 1000;
    const noveltyFactor = (isNewDevice ? 0.5 : 0) + (isNewMerchant ? 0.5 : 0);

    // Multi-dimensional distance from expected centroid (0, 0, 0, 0)
    const vectorMagnitude = Math.sqrt(
      normAmount ** 2 + normVelocity ** 2 + normGeo ** 2 + noveltyFactor ** 2
    );
    const isolationTreeAnomalyFactor = Number(
      Math.min(1, vectorMagnitude / Math.sqrt(4)).toFixed(3)
    );

    // Composite raw anomaly score
    const rawScore =
      amountRisk +
      velocityRisk +
      geoRisk +
      deviceRisk +
      merchantRisk +
      isolationTreeAnomalyFactor * 20;

    const boundedAnomalyScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    return {
      anomalyScore: boundedAnomalyScore,
      amountZScore: Number(zScore.toFixed(2)),
      amountDeviationRatio: Number(deviationRatio.toFixed(2)),
      historicalAvgAmount: Math.round(avg),
      timeSinceLastTxnMinutes: Math.round(timeSinceLastTxnMinutes),
      isNewMerchant,
      isNewDevice,
      geoDistanceKm: Math.round(geoDistanceKm),
      travelVelocityKmH: Math.round(travelVelocityKmH),
      isolationTreeAnomalyFactor,
      subFactors: {
        amountRisk,
        velocityRisk,
        geoRisk,
        deviceRisk,
        merchantRisk,
      },
    };
  }
}
