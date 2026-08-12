import * as readline from "node:readline";

/**
 * Creates a readline interface for interactive CLI prompts.
 */
function createRl(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompts the user with a question and returns their answer.
 */
export function prompt(question: string): Promise<string> {
  const rl = createRl();
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Prompts with a default fallback value if the user presses Enter with no input.
 */
export async function promptWithDefault(question: string, defaultValue: string): Promise<string> {
  const answer = await prompt(`${question} (default: ${defaultValue}): `);
  return answer.length > 0 ? answer : defaultValue;
}

/**
 * Presents a numbered list of choices and returns the chosen item's value.
 */
export async function select<T extends string>(question: string, choices: { label: string; value: T }[]): Promise<T> {
  console.log(`\n${question}`);
  choices.forEach((c, i) => console.log(`  ${i + 1}. ${c.label}`));

  while (true) {
    const answer = await prompt(`\nEnter number (1-${choices.length}): `);
    const idx = parseInt(answer, 10) - 1;
    if (idx >= 0 && idx < choices.length && choices[idx]) {
      return choices[idx].value;
    }
    console.log(`  ❌ Invalid choice. Please enter a number between 1 and ${choices.length}.`);
  }
}

/**
 * Asks a yes/no confirmation question. Returns true for yes.
 */
export async function confirm(question: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? "Y/n" : "y/N";
  const answer = await prompt(`${question} [${hint}]: `);
  if (answer.length === 0) return defaultYes;
  return answer.toLowerCase().startsWith("y");
}
