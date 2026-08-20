# Primary School Chatbot (pscb)

> Anyone with primary-school reading, writing, and arithmetic can create their own chatbot.

**Open `index.html` in any modern browser — no installation required.**

---

## Quick start (5 minutes)

### 1. Make it say hello

Open the app. Click **✏️ Edit** to open the editor. Type:

```
If someone says hello:
    say Hello! I am happy to meet you.
```

Click **▶ Apply** and type `hello` in the chat. Your chatbot replies immediately.

### 2. Give it a name

Add to the top of your rules:

```
My chatbot is called Sunny.
Sunny is friendly.
```

Click **▶ Apply**. The chatbot title updates.

### 3. Ask it a question

```
Question: What is your favourite colour?
Answer: My favourite colour is blue.
```

### 4. Give it two possible answers

```
If someone says hello:
    say one of:
        Hello!
        Hi there!
        Good to see you!
```

### 5. Use a variable

```
If someone says My name is [name]:
    say Hello [name]! Nice to meet you.
```

Try typing: `My name is Alex`

### 6. Remember someone's name

```
If someone says My name is [name]:
    remember their name is [name].
    say Nice to meet you, [name]!
If someone asks What is my name?:
    if we know their name:
        say Your name is [name].
    otherwise:
        say You haven't told me your name yet.
```

### 7. Teach it a fact

```
A dog is an animal.
A cat is an animal.
An animal is a living thing.
```

Now ask: `Is a dog an animal?` — your chatbot will say **Yes.**  
Ask: `Is a dog a living thing?` — it chains the facts and says **Yes.** too.

### 8. Teach it a rule

```
If something is a dog:
    say it is an animal.
```

### 9. Ask it to reason (Why?)

After the chatbot replies, click **Why did you say that?** to see a step-by-step explanation.

### 10. Export the chatbot

Click **▶ Apply** then **🌐 Export**. A self-contained HTML file is downloaded that works completely offline and can be shared or put on GitHub Pages.

---

## Authoring language reference

| Construct | Example |
|---|---|
| Name | `My chatbot is called Sam.` |
| Personality | `Sam is friendly.` |
| Trigger rule | `If someone says hello:` |
| Question rule | `If someone asks What is your name?:` |
| Question/Answer pair | `Question: …  Answer: …` |
| Say | `    say Hello!` |
| Multiple answers | `    say one of:` / `        Hello!` |
| Variable | `[name]`, `[number]`, `[thing]` |
| Remember | `    remember their name is [name].` |
| Forget | `    forget name.` |
| Condition | `    if we know their name:` |
| Otherwise | `    otherwise:` |
| Fact | `A dog is an animal.` |
| Negative fact | `A square is not a circle.` |
| Inference rule | `If something is a dog:` |
| Fallback | `If I don't know:` |
| OR trigger | `or someone says hi:` |
| Alias | `hello means:  hi  hey` |
| Arithmetic (built-in) | `What is 7 + 8?` → `15` |
| Comment | `# this is a comment` |

Variables use `[square brackets]` and match any text.

---

## Example chatbots

| Example | Description |
|---|---|
| `examples/hello_bot/` | Friendly greeting bot |
| `examples/math_bot/` | Elementary arithmetic helper |
| `examples/animal_bot/` | Animal facts and category reasoning |
| `examples/quiz_bot/` | Simple question-and-answer quiz |
| `examples/story_bot/` | Fictional pirate character |

To load an example, click **⬆ Load** and pick the `.chatbot.txt` file.

---

## Running the tests

```bash
node tests/test_suite.js
```

Requires Node.js. No other dependencies.

---

## Repository structure

```
/
├── index.html              Browser application
├── css/
│   └── chatbot.css         All styles
├── js/
│   ├── app.js              Application entry point
│   ├── author.js           Author/edit mode
│   ├── parser.js           Authoring language parser
│   ├── runtime.js          Conversation engine
│   ├── reasoning.js        Logical inference (facts, rules)
│   ├── memory.js           Conversation memory
│   ├── storage.js          Save/load chatbot files
│   └── export.js           Export as web page
├── examples/               Sample chatbots
├── tests/
│   └── test_suite.js       Unit and integration tests
├── PROGRAM_REQUIREMENTS.md Full specification
└── pr1.txt                 Original specification file
```

---

## Design principles

- No JavaScript, Prolog, or programming knowledge required for ordinary use.
- All chatbot behaviour comes from readable rules the author can inspect.
- Every answer can show its reasoning ("Why did you say that?").
- Works offline after first page load.
- No server, API key, or cloud service needed.

See [PROGRAM_REQUIREMENTS.md](PROGRAM_REQUIREMENTS.md) for the full specification.
