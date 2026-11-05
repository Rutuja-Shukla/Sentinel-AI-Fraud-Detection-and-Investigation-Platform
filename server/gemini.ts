import { GoogleGenAI, Type } from '@google/genai';
import {
  AIInvestigationSummary,
  CustomerProfile,
  RiskAssessment,
  Transaction,
} from './models.ts';

// Server-side initialization of Gemini Client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Generates an Explainable AI Investigation Report for a flagged transaction.
 * Advisory only: Does NOT determine guilt, change risk scores, or enforce blocks.
 */
export async function generateInvestigationExplanation(
  txn: Transaction,
  customer: CustomerProfile,
  assessment: RiskAssessment,
  recentTransactions: Transaction[]
): Promise<AIInvestigationSummary> {
  const ai = getGeminiClient();

  // If Gemini client is unavailable, return an auditable rule-driven forensic summary
  if (!ai) {
    return generateFallbackForensicSummary(
      txn,
      customer,
      assessment,
      'Gemini API key not configured in environment. Generated via Sentinel Forensic Rule Compiler.'
    );
  }

  const prompt = `You are Sentinel's Explainable AI Fraud Investigation Assistant, acting as a senior forensic banking investigator.
Analyze the following flagged financial transaction, deterministic rule evaluation, and customer historical baseline.

CRITICAL INSTRUCTIONS:
1. You are providing an ADVISORY investigation brief for human fraud analysts.
2. You must NOT declare the customer or cardholder guilty of fraud or a crime.
3. You must NOT modify or contradict the deterministic risk score (${assessment.overallScore}/100 - ${assessment.riskClassification}).
4. Always provide plausible benign explanations (e.g., travel, vacation purchase, emergency expense, authorized family use, VPN usage).
5. Provide actionable, practical next steps for an investigator (e.g., out-of-band verification, 3DS log check).

TRANSACTION TELEMETRY:
- ID: ${txn.id}
- Customer ID: ${customer.customerId} (Account: ${customer.accountNumber})
- Amount: $${txn.amount.toFixed(2)} ${txn.currency}
- Timestamp: ${txn.timestamp}
- Channel: ${txn.channel}
- Transaction Type: ${txn.transactionType}
- Merchant: ${txn.merchantName} (${txn.merchantCategory})
- Origin Location: ${txn.sourceLocation.city}, ${txn.sourceLocation.country} (IP: ${txn.sourceLocation.ipAddress || 'N/A'})
- Device ID: ${txn.deviceId} (${txn.deviceType})
- Current Status: ${txn.status}

CUSTOMER HISTORICAL PROFILE:
- Account Age: ${customer.accountAgeDays} days (${customer.tier} tier)
- Historical Average Amount: $${customer.averageTxnAmount.toFixed(2)} (Std Dev: $${customer.stdDevTxnAmount.toFixed(2)})
- Typical Locations: ${customer.frequentLocations.map((l) => `${l.city}, ${l.country}`).join('; ')}
- Known Devices: ${customer.knownDevices.join(', ')}
- Known Merchants: ${customer.topMerchants.join(', ')}

DETERMINISTIC EVALUATION:
- Overall Risk Score: ${assessment.overallScore}/100 (${assessment.riskClassification})
- Deterministic Rule Matches:
${assessment.matchedRules.map((r) => `  * [${r.ruleId}] ${r.ruleName} (${r.severity}, +${r.scoreContribution}pts): ${r.description}`).join('\n')}
- Statistical Anomaly Details:
  * Anomaly Score: ${assessment.anomalyDetails.anomalyScore}/100
  * Amount Z-Score: ${assessment.anomalyDetails.amountZScore}σ
  * Deviation Ratio: ${assessment.anomalyDetails.amountDeviationRatio}x
  * Implied Travel Velocity: ${assessment.anomalyDetails.travelVelocityKmH} km/h (Distance: ${assessment.anomalyDetails.geoDistanceKm} km)
  * Time Since Last Txn: ${assessment.anomalyDetails.timeSinceLastTxnMinutes} minutes
  * Is New Device: ${assessment.anomalyDetails.isNewDevice}
  * Is New Merchant: ${assessment.anomalyDetails.isNewMerchant}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are Sentinel, an enterprise AI financial crime investigation assistant. Return valid structured JSON matching the provided schema. Be concise, precise, forensic, and objective.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: {
              type: Type.STRING,
              description: 'Executive summary summarizing the flagged event and context.',
            },
            flaggedReasons: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Specific reasons this transaction triggered alerts.',
            },
            patternAnalysis: {
              type: Type.STRING,
              description: 'Behavioral analysis comparing current activity with customer profile.',
            },
            supportingEvidence: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Key empirical data points and telemetry observations.',
            },
            benignExplanations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Legitimate or non-fraud explanations that must be ruled out.',
            },
            recommendedSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Prioritized investigation checklist for the human analyst.',
            },
            missingInformation: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Additional telemetry or documentation needed to make a conclusive finding.',
            },
            confidenceLevel: {
              type: Type.STRING,
              description: 'Assessment confidence: HIGH, MEDIUM, or LOW.',
            },
            limitations: {
              type: Type.STRING,
              description: 'Forensic caveats and model boundaries.',
            },
          },
          required: [
            'executiveSummary',
            'flaggedReasons',
            'patternAnalysis',
            'supportingEvidence',
            'benignExplanations',
            'recommendedSteps',
            'missingInformation',
            'confidenceLevel',
            'limitations',
          ],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    const parsed = JSON.parse(text);

    return {
      executiveSummary: parsed.executiveSummary || 'Transaction flagged by Sentinel detection systems.',
      flaggedReasons: parsed.flaggedReasons || assessment.contributingFactors,
      patternAnalysis: parsed.patternAnalysis || 'Analysis completed.',
      supportingEvidence: parsed.supportingEvidence || [],
      benignExplanations: parsed.benignExplanations || ['Authorized customer transaction with unusual characteristics.'],
      recommendedSteps: parsed.recommendedSteps || ['Contact customer via authenticated mobile push.'],
      missingInformation: parsed.missingInformation || ['Device hardware fingerprint', '3-D Secure authentication log'],
      confidenceLevel: (['HIGH', 'MEDIUM', 'LOW'].includes(parsed.confidenceLevel) ? parsed.confidenceLevel : 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW',
      limitations: parsed.limitations || 'Advisory brief based on synthetic telemetry. Requires human investigator validation.',
      generatedAt: new Date().toISOString(),
      model: 'gemini-3.8-flash',
      disclaimer: 'AI-Generated Investigation Advisory. Does not dictate guilt or automatically apply account freezes.',
    };
  } catch (error: any) {
    console.error('Failed to generate Gemini explanation, falling back to deterministic compiler:', error);
    return generateFallbackForensicSummary(
      txn,
      customer,
      assessment,
      `AI Service Notice: ${error?.message || 'Upstream timeout'}. Compiled using Sentinel Forensic Core.`
    );
  }
}

/**
 * Deterministic fallback generator when external API is unreachable.
 */
function generateFallbackForensicSummary(
  txn: Transaction,
  customer: CustomerProfile,
  assessment: RiskAssessment,
  notice: string
): AIInvestigationSummary {
  const reasons = assessment.matchedRules.map(
    (r) => `${r.ruleName}: ${r.description}`
  );
  if (reasons.length === 0) {
    reasons.push(`Statistical anomaly score of ${assessment.anomalyScore}/100.`);
  }

  const benign: string[] = [];
  if (txn.merchantCategory === 'AIRLINE' || txn.merchantCategory === 'HOTEL') {
    benign.push('Cardholder may be legitimately booking international travel or vacation arrangements.');
  }
  if (assessment.anomalyDetails.isNewDevice) {
    benign.push('Cardholder may have recently upgraded or reset their mobile handset / browser profile.');
  }
  if (assessment.anomalyDetails.geoDistanceKm > 500) {
    benign.push('Cardholder may be utilizing an enterprise corporate VPN or proxy endpoint.');
  }
  benign.push('Customer may be making an infrequent high-value annual purchase or emergency expense.');

  const steps = [
    'Attempt out-of-band contact via authenticated banking mobile app push confirmation.',
    'Review 3-D Secure (3DS) authentication status and CVV/AVS verification result.',
    'Inspect device browser user-agent and IP ASN routing (residential ISP vs data center / VPN).',
    'Verify if customer submitted recent travel notification or address update.',
  ];

  return {
    executiveSummary: `Transaction ${txn.id} ($${txn.amount.toFixed(2)} to ${txn.merchantName}) triggered a risk assessment of ${assessment.overallScore}/100 (${assessment.riskClassification}) based on ${assessment.matchedRules.length} deterministic rules and an anomaly score of ${assessment.anomalyScore}/100.`,
    flaggedReasons: reasons,
    patternAnalysis: `Customer ${customer.customerId} typically transacts with an average of $${customer.averageTxnAmount.toFixed(2)} across ${customer.frequentLocations.map((l) => l.city).join(', ')}. Current transaction deviates by ${assessment.anomalyDetails.amountDeviationRatio}x baseline amount with implied travel speed of ${assessment.anomalyDetails.travelVelocityKmH} km/h.`,
    supportingEvidence: [
      `Amount: $${txn.amount.toFixed(2)} vs Historical Avg $${customer.averageTxnAmount.toFixed(2)} (Z-Score: +${assessment.anomalyDetails.amountZScore}σ)`,
      `Device ID: ${txn.deviceId} (Known device: ${!assessment.anomalyDetails.isNewDevice ? 'YES' : 'NO'})`,
      `Location: ${txn.sourceLocation.city}, ${txn.sourceLocation.country} (Distance from prior txn: ${assessment.anomalyDetails.geoDistanceKm} km)`,
      `Matched Rules: ${assessment.matchedRules.map((r) => r.ruleId).join(', ') || 'None'}`,
    ],
    benignExplanations: benign,
    recommendedSteps: steps,
    missingInformation: [
      '3-D Secure Step-Up Challenge Logs',
      'Historical IP Subnet / ASN Telemetry',
      'Associated Cardholder SMS verification responses',
    ],
    confidenceLevel: assessment.overallScore > 75 ? 'HIGH' : 'MEDIUM',
    limitations: `${notice}. AI-generated advisory content for review by authorized fraud personnel only.`,
    generatedAt: new Date().toISOString(),
    model: 'Sentinel-Forensic-Engine-v2.4',
    disclaimer: 'Advisory only. Deterministic scoring and investigator judgement govern final case outcomes.',
  };
}
