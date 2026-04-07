export type ScanResult = {
  file: string;
  line: number;
  pattern: string;
  match: string;
};

const SECRET_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: "OpenAI API Key", regex: /sk-[a-zA-Z0-9]{20,}/ },
  { name: "Stripe Live Key", regex: /sk_live_[a-zA-Z0-9]{24,}/ },
  { name: "Stripe Test Key", regex: /sk_test_[a-zA-Z0-9]{24,}/ },
  { name: "GitHub PAT", regex: /ghp_[a-zA-Z0-9]{36,}/ },
  { name: "Slack Token", regex: /xoxb-[a-zA-Z0-9-]+/ },
  { name: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/ },
  { name: "Generic API Key", regex: /(?:api[_-]?key|apikey|secret[_-]?key)\s*[:=]\s*["']([a-zA-Z0-9_\-]{20,})["']/i },
];

const HIGH_ENTROPY_REGEX = /["'][a-zA-Z0-9+/=]{40,}["']/;

function isHighEntropy(str: string): boolean {
  // Shannon entropy calculation
  const freq: Record<string, number> = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  let entropy = 0;
  const len = str.length;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy > 4.5 && str.length > 30;
}

export function scanForSecrets(
  files: Record<string, string>
): ScanResult[] {
  const results: ScanResult[] = [];

  for (const [filename, content] of Object.entries(files)) {
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check known patterns
      for (const { name, regex } of SECRET_PATTERNS) {
        const match = line.match(regex);
        if (match) {
          results.push({
            file: filename,
            line: i + 1,
            pattern: name,
            match: match[0].substring(0, 20) + "...",
          });
        }
      }

      // Check high-entropy strings
      const entropyMatch = line.match(HIGH_ENTROPY_REGEX);
      if (entropyMatch) {
        const str = entropyMatch[0].slice(1, -1); // remove quotes
        if (isHighEntropy(str)) {
          results.push({
            file: filename,
            line: i + 1,
            pattern: "High-entropy string",
            match: str.substring(0, 20) + "...",
          });
        }
      }
    }
  }

  return results;
}
