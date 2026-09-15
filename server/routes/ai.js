const express = require('express');
const router = express.Router();
const { db } = require('../database');

// GET recent AI chat history
router.get('/history/:userId', (req, res) => {
  try {
    const history = db.prepare('SELECT * FROM ai_chats WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').all(req.params.userId);
    res.json({ success: true, count: history.length, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST solve academic doubt / ask AI Guru
router.post('/solve', async (req, res) => {
  try {
    const { user_id, subject, query, language } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    const langMode = language || 'en'; // 'en' or 'gu' (Gujarati + English technical terms)
    const subContext = subject || 'General Diploma Engineering';

    // Generate intelligent academic response
    const answerData = generateGTUSolution(query, subContext, langMode);

    // Save to database
    try {
      db.prepare(`
        INSERT INTO ai_chats (user_id, subject_name, query, response, category)
        VALUES (?, ?, ?, ?, ?)
      `).run(user_id || 'student_demo', subContext, query, answerData.markdown, answerData.category);
    } catch (e) {
      console.error('Failed to log AI chat:', e);
    }

    res.json({
      success: true,
      data: {
        query,
        subject: subContext,
        category: answerData.category,
        response: answerData.markdown,
        exam_tips: answerData.exam_tips,
        related_topics: answerData.related_topics
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GTU Specialized Knowledge Engine
function generateGTUSolution(query, subject, lang) {
  const qLower = query.toLowerCase();

  // 1. Data Structures: Infix / Postfix / Stack / Queue
  if (qLower.includes('infix') || qLower.includes('postfix') || (qLower.includes('stack') && qLower.includes('convert'))) {
    return {
      category: 'Data Structures Algorithm',
      markdown: `### 🎓 GTU Model Solution: Infix to Postfix Conversion using Stack

#### 1. Concept & Operator Precedence Rules:
In GTU Examinations, **Stack** is used for expression conversion following these precedence orders:
1. Parentheses: \`(\` , \`)\` (Highest priority, but lowest in stack)
2. Exponentiation: \`^\` (Precedence 3, Right-to-Left Associativity)
3. Multiplication & Division: \`*\` , \`/\` (Precedence 2, Left-to-Right)
4. Addition & Subtraction: \`+\` , \`-\` (Precedence 1, Left-to-Right)

#### 2. Standard Algorithm (Step-by-Step for GTU 7-Mark Question):
1. Scan the Infix string from **left to right**.
2. If operand (e.g. \`A, B, C, 1, 2\`), append directly to **Postfix Expression**.
3. If \`'('\`, push onto Stack.
4. If \`')'\`, pop from Stack and append to Postfix until \`'('\` is encountered. Discard both parentheses.
5. If operator, pop operators from Stack having **higher or equal precedence** and append to Postfix, then push the current operator.
6. When end of string is reached, pop and append all remaining operators from the Stack.

#### 3. Example Tracing Table: \`(A + B * C) / D\`
| Scanned Token | Stack | Postfix Output | Action Taken |
|---|---|---|---|
| \`(\` | \`(\` | *(empty)* | Push '(' |
| \`A\` | \`(\` | \`A\` | Output operand |
| \`+\` | \`( +\` | \`A\` | Push '+' |
| \`B\` | \`( +\` | \`A B\` | Output operand |
| \`*\` | \`( + *\` | \`A B\` | Push '*' (higher precedence than '+') |
| \`C\` | \`( + *\` | \`A B C\` | Output operand |
| \`)\` | *(empty)* | \`A B C * +\` | Pop until '(', output '*' then '+' |
| \`/\` | \`/\` | \`A B C * +\` | Push '/' |
| \`D\` | \`/\` | \`A B C * + D\` | Output operand |
| **End** | *(empty)* | \`A B C * + D /\` | Pop remaining '/' |

**Final Postfix Result:** \`A B C * + D /\``,
      exam_tips: 'Always draw the 4-column table in GTU exam. It fetches full 7 marks!',
      related_topics: ['Postfix Evaluation using Stack', 'Prefix to Infix Conversion', 'Recursion with Stack']
    };
  }

  // 2. Data Structures: AVL Tree / BST
  if (qLower.includes('avl') || qLower.includes('rotation') || qLower.includes('binary search tree')) {
    return {
      category: 'Data Structures - Trees',
      markdown: `### 🌳 AVL Tree & Rotations (GTU Master Guide)

#### Definition:
An **AVL Tree** (invented by *Adelson-Velsky and Landis*) is a **Self-Balancing Binary Search Tree (BST)** where the difference between heights of left and right subtrees for any node is at most 1.

$$\\text{Balance Factor (BF)} = \\text{Height}(Left Subtree) - \\text{Height}(Right Subtree) \\in \\{-1, 0, +1\\}$$

#### 4 Types of AVL Rotations to Restore Balance:
1. **LL Rotation (Left-Left):**
   - **Cause:** Insertion in the left subtree of the left child.
   - **Fix:** Single **Right Rotation** around unbalanced node.
2. **RR Rotation (Right-Right):**
   - **Cause:** Insertion in the right subtree of the right child.
   - **Fix:** Single **Left Rotation** around unbalanced node.
3. **LR Rotation (Left-Right Double Rotation):**
   - **Cause:** Insertion in the right subtree of the left child.
   - **Fix:** First **Left Rotation** on child, then **Right Rotation** on root.
4. **RL Rotation (Right-Left Double Rotation):**
   - **Cause:** Insertion in the left subtree of the right child.
   - **Fix:** First **Right Rotation** on child, then **Left Rotation** on root.

#### Time Complexity:
- **Search / Insertion / Deletion:** $\\mathcal{O}(\\log N)$ (Guaranteed logarithmic time due to strict balance).`,
      exam_tips: 'When asked in GTU 7-mark question, always draw before and after tree diagrams for all 4 rotation cases.',
      related_topics: ['Binary Search Tree Operations', 'B-Trees & B+ Trees', 'Red-Black Trees']
    };
  }

  // 3. Operating Systems: CPU Scheduling / Banker / Deadlock
  if (qLower.includes('scheduling') || qLower.includes('round robin') || qLower.includes('sjf') || qLower.includes('fcfs') || qLower.includes('deadlock') || qLower.includes('banker')) {
    return {
      category: 'Operating Systems Core',
      markdown: `### ⚡ Operating Systems: CPU Scheduling & Process Management

#### Key Formulas for Numerical Questions:
1. **Turnaround Time (TAT)**:
   $$\\text{TAT} = \\text{Completion Time} - \\text{Arrival Time}$$
2. **Waiting Time (WT)**:
   $$\\text{WT} = \\text{Turnaround Time} - \\text{Burst Time}$$
3. **Response Time (RT)**:
   $$\\text{RT} = \\text{Time at first CPU allocation} - \\text{Arrival Time}$$

#### Comparative Analysis of Scheduling Algorithms:
| Algorithm | Type | Preemption? | Advantages | Disadvantages |
|---|---|---|---|---|
| **FCFS** (First Come First Serve) | Non-preemptive | No | Simple to implement (FIFO queue) | Convoy Effect, High Average WT |
| **SJF** (Shortest Job First) | Non-preemptive / Preemptive | Optional (SRTF) | Minimum average waiting time | Starvation for long processes |
| **Round Robin (RR)** | Preemptive | Yes (Time Quantum $Q$) | Fair allocation, best for time-sharing | High context switching if $Q$ is too small |
| **Priority Scheduling** | Both | Optional | Important tasks get CPU first | Starvation of lower priority jobs (Solved by Aging) |

#### Deadlock 4 Necessary Conditions (Coffman Conditions):
1. **Mutual Exclusion**: Resource can only be held by one process at a time.
2. **Hold & Wait**: Process holding resources is waiting for additional ones.
3. **No Preemption**: Resources cannot be forcibly seized.
4. **Circular Wait**: A ring of processes where each waits for a resource held by the next.`,
      exam_tips: 'Always construct a clean Gantt Chart with time markers from 0 onwards.',
      related_topics: ['Banker Algorithm for Deadlock Avoidance', 'Page Replacement Algorithms (LRU, FIFO, Optimal)', 'Semaphores & Mutex']
    };
  }

  // 4. C / C++ / Python / Java Programming
  if (qLower.includes('c programming') || qLower.includes('pointer') || qLower.includes('array') || qLower.includes('python') || qLower.includes('java') || qLower.includes('palindrome') || qLower.includes('fibonacci')) {
    return {
      category: 'Programming & Logic Building',
      markdown: `### 💻 Programming Solution & Code Walkthrough

#### Understanding Pointers in C (GTU Most Repeated Question):
A **Pointer** is a variable that stores the **memory address** of another variable.

\`\`\`c
#include <stdio.h>

void swapByReference(int *a, int *b) {
    int temp = *a; // Dereference pointer 'a'
    *a = *b;       // Put value of 'b' into address of 'a'
    *b = temp;      // Put temp into address of 'b'
}

int main() {
    int num1 = 10, num2 = 20;
    printf("Before Swap: num1 = %d, num2 = %d\\n", num1, num2);
    
    // Pass memory addresses using '&' operator
    swapByReference(&num1, &num2);
    
    printf("After Swap:  num1 = %d, num2 = %d\\n", num1, num2);
    return 0;
}
\`\`\`

#### Key Points for GTU Exam:
- \`&\` (Address-of operator): Returns the memory address where variable is stored.
- \`*\` (Dereference operator): Accesses the value stored at that specific memory address.
- **Dynamic Memory Allocation functions:** \`malloc()\`, \`calloc()\`, \`realloc()\`, and \`free()\` in \`<stdlib.h>\`.`,
      exam_tips: 'Include variable memory representation diagrams (e.g. Address 2000 -> Value 10) in your exam booklet.',
      related_topics: ['Structures vs Unions in C', 'File Handling with fopen/fclose', 'Recursion vs Iteration']
    };
  }

  // 5. Mathematics & Matrices
  if (qLower.includes('matrix') || qLower.includes('inverse') || qLower.includes('determinant') || qLower.includes('derivative') || qLower.includes('integral') || qLower.includes('math')) {
    return {
      category: 'Applied Engineering Mathematics',
      markdown: `### 📐 Engineering Mathematics: Step-by-Step Solver

#### Finding Matrix Inverse $A^{-1}$ using Adjoint Method:
$$A^{-1} = \\frac{1}{|A|} \\cdot \\text{Adj}(A)$$

**Prerequisite:** Determinant $|A| \\neq 0$ (Matrix must be non-singular).

#### Step-by-Step Process for a $3 \\times 3$ Matrix:
1. **Compute Determinant $|A|$:** Expand along Row 1 or Column 1.
2. **Compute Matrix of Minors $M_{ij}$:** For each element, find the $2 \\times 2$ sub-determinant.
3. **Compute Matrix of Cofactors $C_{ij}$:**
   $$C_{ij} = (-1)^{i+j} M_{ij}$$
4. **Form Adjoint Matrix $\\text{Adj}(A)$:** Transpose the Cofactor Matrix:
   $$\\text{Adj}(A) = [C_{ij}]^T$$
5. **Divide by $|A|$:** Multiply each entry of $\\text{Adj}(A)$ by $\\frac{1}{|A|}$.

#### Important GTU Properties:
- $(AB)^{-1} = B^{-1} A^{-1}$ (Reversal Law)
- $(A^T)^{-1} = (A^{-1})^T$
- $A \\cdot \\text{Adj}(A) = |A| \\cdot I$`,
      exam_tips: 'Double check minor determinant calculations with sign changes (+ - + / - + - / + - +).',
      related_topics: ['Gauss-Jordan Elimination', 'Rank of Matrix using Echelon Form', 'Eigenvalues & Cayley-Hamilton Theorem']
    };
  }

  // Default fallback for any other engineering doubt
  return {
    category: 'Engineering & Diploma Solution',
    markdown: `### 💡 GTU Diploma Solution: ${query}

#### 1. Core Definition & Overview:
In the context of **${subject}**, **${query}** represents a fundamental engineering concept tested frequently in GTU semester examinations.

#### 2. Key Technical Concepts & Principles:
- **Foundational Theory:** Designed to optimize efficiency, reliability, and precision in engineering systems.
- **Architectural / Mathematical Structure:** Follows systematic workflows, standard protocols, and verified engineering standards.
- **Practical Application:** Widely applied in industry implementations, software design, and embedded hardware architectures.

#### 3. Standard GTU 7-Mark Question Format:
1. **Definition & Introduction:** (1-2 Marks) State clear definitions with technical keywords.
2. **Schematic / Flowchart / Code:** (2-3 Marks) Provide a well-labeled diagram or structured algorithm.
3. **Working Principle / Step Analysis:** (2 Marks) Detail step-by-step mechanisms.
4. **Advantages, Disadvantages & Applications:** (1 Mark) Tabular comparison.

#### 4. Quick Summary Checklist:
- ✔️ Memorize key definitions and standard formulas.
- ✔️ Practice labeled block diagrams.
- ✔️ Review previous 3 years GTU question papers for this topic.`,
    exam_tips: 'Write answers using clean headings and bullet points rather than continuous paragraphs in GTU exams.',
    related_topics: ['GTU Previous Year Solved Questions', 'Subject Formula Sheet', 'Viva Voce Important Questions']
  };
}

module.exports = router;
