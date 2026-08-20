GitHub Agent Prolog Program Requirements

Everyone Can Write Their Own Chatbot

1. Purpose

Build a simple educational chatbot programming system in which anyone with primary-school-level reading, writing, arithmetic, and computer knowledge can create their own chatbot.

The finished application must be a JavaScript web page resembling a professional modern chatbot, while the chatbot’s knowledge, rules, personality, responses, and simple reasoning can be authored using extremely simple statements.

The project should demonstrate that writing a useful chatbot does not require knowledge of machine learning, neural networks, advanced mathematics, or conventional software engineering.

The implementation should use:

* JavaScript/HTML/CSS for the browser-based chatbot interface.
* Prolog for the reference language, rule representation, compiler/interpreter, tests, and chatbot logic where appropriate.
* A deliberately small, understandable authoring language suitable for children and beginners.

⸻

2. Primary Design Principle

The central requirement is:

If a person can read and write simple primary-school sentences, they should be able to write a chatbot.

The author should be able to write things comparable to:

My chatbot is called Sam.
Sam is friendly.
If someone says hello:
    say Hello!
If someone asks What is 2 + 2?:
    say 4
Dogs are animals.
Cats are animals.
If someone asks Is a dog an animal?:
    say Yes.

No JavaScript or Prolog knowledge should be required for ordinary chatbot authorship.

⸻

3. Target Users

The system must be usable by:

* primary-school students;
* teachers;
* parents;
* non-programmers;
* beginner programmers;
* writers;
* hobbyists;
* people designing simple educational assistants;
* people who want to experiment with rules, dialogue, stories, games, or knowledge bases.

Advanced users may inspect the generated Prolog/JavaScript representation, but this must never be necessary for ordinary use.

⸻

4. Basic User Experience

The web application must initially resemble a polished professional chatbot.

It must contain at least:

+-------------------------------------------------------+
| My Chatbot                                      ⚙     |
+-------------------------------------------------------+
|                                                       |
|              Hello! How can I help?                   |
|                                                       |
| User: What is your favourite colour?                  |
|                                                       |
| Bot: My favourite colour is blue.                     |
|                                                       |
|                                                       |
+-------------------------------------------------------+
| Ask something...                               Send   |
+-------------------------------------------------------+

Required interface features:

* scrolling conversation;
* user and chatbot message bubbles;
* text input;
* Send button;
* Enter-to-send;
* chatbot name;
* chatbot avatar/icon;
* new conversation;
* clear conversation;
* author/edit mode;
* run/test mode;
* responsive layout;
* desktop and mobile support;
* readable typography;
* accessible keyboard controls.

The appearance should be familiar to users of modern chatbot applications without copying any particular proprietary product.

⸻

5. Two Main Modes

The application must have two principal modes.

5.1 Chat Mode

The user talks to the chatbot normally.

Example:

User:
Hello
Bot:
Hello! Nice to meet you.
User:
What is 5 + 7?
Bot:
12

5.2 Author Mode

The user edits the chatbot using simple English-like rules.

Example:

My chatbot is called Sunny.
Sunny is cheerful.
If someone says hello:
    say Hello! I hope you are having a good day.
If someone says goodbye:
    say Goodbye! See you later.
Apples are fruit.
Bananas are fruit.
If someone asks What fruit do you know?:
    say Apples and bananas.

A button should immediately switch between editing and testing.

⸻

6. Primary-School Authoring Language

The first version must intentionally use a very small language.

The language should prioritise:

1. readability;
2. predictability;
3. learnability;
4. simple error messages;
5. one obvious way to perform common tasks.

It must avoid punctuation-heavy programming syntax wherever practical.

⸻

7. Required Language Constructs

The BASIC version should support the following constructs.

7.1 Facts

A dog is an animal.
A cat is an animal.
The sky is blue.
My favourite colour is green.

Internally these may become Prolog facts such as:

is_a(dog, animal).
is_a(cat, animal).
colour(sky, blue).
favourite_colour(bot, green).

⸻

8. Direct Question and Answer Rules

The simplest possible chatbot rule must be supported:

Question: What is your name?
Answer: My name is Sunny.

Alternative beginner syntax may be:

If someone asks What is your name?:
    say My name is Sunny.

Both forms may compile to the same internal representation.

⸻

9. Trigger Rules

Support simple triggers:

If someone says hello:
    say Hello!
If someone says thank you:
    say You're welcome.
If someone says good morning:
    say Good morning!

Matching should initially be case-insensitive.

⸻

10. Variables

Introduce variables using readable language.

Example:

If someone says My name is [name]:
    say Hello [name]!

Example conversation:

User:
My name is Alex.
Bot:
Hello Alex!

Variables should use a visually obvious notation such as:

[name]
[animal]
[number]
[place]

The system must not require the author to understand Prolog variables.

⸻

11. Remembering Information

Support extremely simple memory.

If someone says My name is [name]:
    remember their name is [name].

Later:

If we know their name:
    say Hello [name]!

Example:

User:
My name is Mia.
Bot:
Nice to meet you, Mia.
User:
What is my name?
Bot:
Your name is Mia.

Memory should initially be restricted to the current conversation.

⸻

12. Forgetting

Support:

forget their name.

and a user-visible:

Clear memory

control.

The system must make it obvious what information is stored.

⸻

13. Conditions

Support simple conditions:

If their favourite colour is blue:
    say I like blue too.

and:

If [number] is bigger than 10:
    say That is a big number.

Avoid requiring Boolean expressions in the beginner language.

⸻

14. AND

Support an intuitive and form.

If the animal is a dog
and the colour is brown:
    say It might be a brown dog.

The parser may convert this into a Prolog conjunction internally.

⸻

15. OR

Provide a simple form:

If someone says hello
or someone says hi:
    say Hello!

Internally, this should be represented explicitly rather than exposing Prolog ; syntax.

⸻

16. NOT

Support straightforward negative knowledge:

A square is not a circle.

and conditions such as:

If [thing] is not an animal:
    say I don't think that is an animal.

Negation semantics must be carefully documented and kept simple.

Do not silently confuse:

* “not known to be true”;
* “known to be false.”

The BASIC version should favour explicit negative facts.

⸻

17. Categories

Allow simple category relationships:

A dog is an animal.
An animal is a living thing.

The chatbot should be capable of answering:

Is a dog a living thing?

with:

Yes.

through simple rule chaining.

⸻

18. Simple Rules

Support rules comparable to primary-school reasoning:

If something is a dog:
    it is an animal.
If something is an animal:
    it is a living thing.

The chatbot may internally translate these into Prolog:

animal(X) :-
    dog(X).
living_thing(X) :-
    animal(X).

⸻

19. Arithmetic

The chatbot must understand elementary arithmetic without the author having to implement it.

At minimum support:

* addition;
* subtraction;
* multiplication;
* division;
* equality;
* greater than;
* less than.

Examples:

What is 4 + 5?
9

and author rules such as:

If [number] is bigger than 100:
    say That is more than one hundred.

⸻

20. Built-In Primary School Knowledge

The default chatbot should ship with a deliberately modest body of general knowledge comparable to primary-school education.

Potential areas include:

* basic arithmetic;
* shapes;
* colours;
* days of the week;
* months;
* simple time concepts;
* basic geography;
* common animals;
* common plants;
* food;
* body parts;
* family relationships;
* elementary science;
* weather concepts;
* simple measurement;
* basic grammar;
* spelling assistance;
* common vocabulary.

The built-in knowledge must be separable from user-created knowledge.

Users must be able to inspect which answer came from:

Built-in knowledge

versus:

My chatbot rules

where practical.

⸻

21. Primary-School Mathematics

Required built-in mathematical knowledge should include at minimum:

1 + 1
10 - 3
4 × 5
20 ÷ 4

as well as:

* counting;
* comparing numbers;
* odd/even;
* elementary fractions where practical;
* common shapes;
* simple units.

The system is not required to provide advanced mathematics in the BASIC release.

⸻

22. Primary-School Language Knowledge

Include simple functions for:

* common word meanings;
* pluralisation where reliable;
* basic sentence recognition;
* question recognition;
* names;
* greetings;
* simple spelling correction;
* punctuation tolerance.

The chatbot should recognise reasonable variants such as:

hello
Hello
hello!
HELLO

as equivalent for trigger purposes.

⸻

23. Built-In Conversational Functions

The chatbot engine must provide reusable built-ins for:

* greeting;
* farewell;
* thanks;
* introductions;
* asking the user’s name;
* remembering a name;
* simple clarification;
* unknown-question response;
* help;
* conversation reset.

These should all be overridable by the chatbot author.

⸻

24. Multiple Answers

Authors should be able to specify multiple possible answers:

If someone says hello:
    say one of:
        Hello!
        Hi!
        Nice to see you!

The implementation may:

* select randomly;
* rotate answers;
* select deterministically.

The behaviour should be configurable.

⸻

25. Simple Personality

Allow personality configuration such as:

My chatbot is called Sunny.
Sunny is friendly.
Sunny is cheerful.
Sunny uses short answers.

Possible supported traits in the BASIC release:

friendly
formal
cheerful
quiet
funny
helpful
short answers
long answers

These should influence templates rather than invoke an opaque AI personality model.

⸻

26. Unknown Questions

Every chatbot must have a controlled fallback.

Example:

If I don't know:
    say I don't know that yet. You can teach me!

The bot must never fabricate an answer merely because no rule matches.

⸻

27. Teaching Through the Interface

When no answer exists, Author Mode may offer:

Teach chatbot

For example:

User:
Who is Max?
Bot:
I don't know that yet.
[Teach chatbot]

Selecting it might create:

Question:
Who is Max?
Answer:
_________________

The generated rule is then added to the chatbot.

⸻

28. Rule Builder

In addition to plain-text editing, provide an optional visual rule builder.

Example:

WHEN
[ someone says ] [ hello ]
DO
[ say ] [ Hello! ]

Another:

WHEN
[ someone says ] [ My name is [name] ]
DO
[ remember ] [ name = [name] ]
AND
[ say ] [ Hello [name]! ]

The visual editor and textual language must represent the same underlying rules.

⸻

29. No-Code Requirement

A complete useful chatbot should be possible without writing:

* JavaScript;
* HTML;
* CSS;
* Prolog;
* JSON;
* regular expressions;
* SQL.

All such details must remain implementation concerns.

⸻

30. Progressive Complexity

The authoring system should teach features incrementally.

Suggested progression:

Level 1
Question → Answer
Level 2
When someone says → Say
Level 3
Variables
Level 4
Remember
Level 5
Facts
Level 6
Rules
Level 7
Conditions
Level 8
Simple reasoning

Users must not need to learn higher levels to continue using lower levels.

⸻

31. Explain My Chatbot

Provide:

Explain my chatbot

The system should generate a child-readable explanation such as:

Your chatbot knows 14 facts.
It has 8 conversation rules.
It remembers the person's name.
It knows that dogs are animals.
Because animals are living things, it can also work out
that dogs are living things.

⸻

32. Why Did You Say That?

Every response generated from authored rules should optionally expose:

Why?

Example:

Bot:
Yes, a dog is a living thing.
Why?
1. You taught me that a dog is an animal.
2. You taught me that an animal is a living thing.
3. So I worked out that a dog is a living thing.

This is a major requirement.

The system should favour transparent symbolic reasoning over unexplained responses.

⸻

33. Prolog Reasoning Engine

Prolog should be used as the reference model for:

* facts;
* rules;
* variable binding;
* pattern matching;
* logical inference;
* rule chaining;
* explanation traces;
* tests;
* validation of generated chatbot logic.

Example internal representation:

fact(is_a(dog, animal)).
fact(is_a(animal, living_thing)).
rule(
    is_a(X, Z),
    [
        is_a(X, Y),
        is_a(Y, Z)
    ]
).

Care must be taken to prevent unrestricted recursion and runaway searches.

⸻

34. Browser Execution

The final chatbot itself must function in an ordinary modern browser.

The GitHub Agent may choose between:

1. implementing the runtime logic directly in JavaScript;
2. compiling the simple authoring rules to JavaScript;
3. using a browser-compatible Prolog engine;
4. using Prolog as a reference compiler/test system and JavaScript as the deployment runtime.

For the BASIC version, prefer the simplest reliable architecture.

No server should be required to run a locally saved chatbot.

⸻

35. Save and Load

Users must be able to save their chatbot.

Support an easy portable file representation.

For example:

sunny.chatbot

or:

sunny.json

The exported file should contain:

* chatbot name;
* personality;
* authored knowledge;
* dialogue rules;
* settings.

It should not contain unnecessary conversation history unless explicitly requested.

⸻

36. Export as Web Page

A major feature is:

Export My Chatbot

This should create a self-contained or easily deployable web chatbot.

The generated application should be publishable through static hosting such as GitHub Pages.

A beginner should be able to:

Write chatbot
→ Test chatbot
→ Export chatbot
→ Open webpage

⸻

37. Shareable Chatbots

Support sharing authored chatbot definitions.

A chatbot definition should be independent enough that another user can import it and immediately run it.

Possible examples:

Math Helper
Animal Expert
Spelling Helper
Story Character
School Tour Guide
Quiz Bot
Classroom Assistant
Museum Guide
Family History Bot

⸻

38. Sample Chatbots

The repository must include examples demonstrating increasing complexity.

Minimum samples:

hello_bot
math_bot
animal_bot
quiz_bot
story_bot
school_helper

Each example should be understandable without specialist programming knowledge.

⸻

39. Quiz Functions

The engine should support simple educational quizzes.

Example:

Ask:
What is 5 + 5?
Correct answer:
10
If correct:
    say Correct!
If wrong:
    say Try again.

Track simple scores:

Score: 4 / 5

⸻

40. Story and Character Chatbots

Support simple fictional-character chatbots.

Example:

My chatbot is called Captain Blue.
Captain Blue is a pirate.
Captain Blue likes treasure.
If someone asks Where is your treasure?:
    say That's a secret!

The system must clearly distinguish authored fictional facts from built-in factual knowledge.

⸻

41. Conversation Context

The BASIC system should support limited context.

Example:

User:
I have a dog.
Bot:
What is its name?
User:
Rover.
Bot:
Rover is a nice name.

This may be implemented through simple conversational state rather than general natural-language understanding.

⸻

42. Context Should Be Explicit

Conversation context must be represented using inspectable state.

For example:

state(waiting_for(dog_name)).

rather than an opaque language-model context.

⸻

43. Natural-Language Matching

The BASIC version should support forgiving but controlled matching.

For example:

What's your name?
What is your name?
what is your name

may map to the same intent.

Implementations may include:

* lowercase normalisation;
* punctuation removal;
* contractions;
* simple synonym tables;
* token matching;
* edit-distance spelling tolerance.

Do not require a neural model.

⸻

44. Intent Aliases

Allow authors to define equivalent phrases:

hello means:
    hello
    hi
    hey
    good morning

Then:

If someone says [hello]:
    say Hello!

⸻

45. Simple Synonyms

Built-in synonym support may include examples such as:

big = large
small = little
hello = hi
child = kid

Authors must be able to override or extend these definitions.

⸻

46. Safety and Predictability

The BASIC chatbot should be fundamentally constrained by its authored rules and built-in functions.

It should not:

* execute arbitrary JavaScript supplied through chat;
* execute shell commands;
* access arbitrary files;
* silently send network requests;
* expose saved personal information;
* evaluate arbitrary Prolog terms;
* inject HTML supplied by users.

All displayed text must be escaped appropriately.

⸻

47. Child-Friendly Error Messages

Never expose errors such as:

ERROR: Arguments are not sufficiently instantiated

to ordinary users.

Instead produce messages such as:

I don't understand line 12.
You wrote:
If someone hello
Perhaps you meant:
If someone says hello:
    say Hello!

Every syntax error should attempt to provide:

* location;
* problem;
* example correction.

⸻

48. Live Validation

Author Mode should check rules while they are written.

Use indicators such as:

✓ I understand this rule.
? I am not sure what this means.
✗ This rule needs fixing.

Errors should not destroy previously valid rules.

⸻

49. Preview

Provide a live preview so an author can edit:

If someone says hello:
    say G'day!

and immediately test:

User:
hello
Bot:
G'day!

⸻

50. Debugging for Children

Provide debugging in conversational terms.

Instead of:

predicate failed

say:

I checked your rules.
I found a rule for "hello", but its condition was not true.

Instead of:

no clause

say:

You haven't taught your chatbot what to do in this situation yet.

⸻

51. Rule Trace

Developers and curious learners may enable a detailed trace:

Input:
Is Rover an animal?
Matched:
question_is_a(Rover, animal)
Known:
Rover is a dog.
Rule:
Every dog is an animal.
Result:
yes

This trace should correspond to the actual computation.

⸻

52. Deterministic Priority

When several conversational rules match, the choice must be predictable.

Suggested priority:

1. Exact question
2. Exact phrase
3. Variable pattern
4. Intent/synonym match
5. Knowledge query
6. General fallback

The system must document this order.

⸻

53. Rule Conflicts

When two rules have equal priority, Author Mode should warn:

These two rules may both answer "hello".
Rule 4:
say Hello!
Rule 9:
say Hi!
Choose which rule should come first.

Do not silently introduce unpredictable behaviour.

⸻

54. Knowledge Conflicts

If a user writes:

The sky is blue.
The sky is green.

the program should not silently choose one.

It should report:

Your chatbot currently has two different facts about the colour of the sky.

The user may then:

* retain both;
* choose one;
* add conditions.

⸻

55. Knowledge Inspector

Provide an optional screen showing:

Facts: 23
Rules: 12
Memories: 2
Intents: 7

Users may inspect these using ordinary language.

⸻

56. Chatbot Functions

The runtime should expose a small set of safe beginner functions such as:

say
ask
remember
forget
add
subtract
multiply
divide
compare
choose
repeat
score
wait
show image
show button
open safe link

Each function must be documented with one elementary example.

⸻

57. Buttons

Authors should be able to produce simple interactive choices.

Ask:
Which animal do you like?
Buttons:
Dog
Cat
Bird

Button selections should be delivered through the same rule system as typed messages.

⸻

58. Images

Optionally support:

show image "dog.jpg"

The initial release should use local/project images or explicitly approved URLs.

Missing images must fail gracefully.

⸻

59. Accessibility

The interface must provide:

* semantic HTML;
* keyboard navigation;
* readable contrast;
* labels for controls;
* screen-reader-friendly message announcements where practical;
* scalable text;
* no dependence on colour alone.

⸻

60. Data Model

Internally, the system should have explicit representations for at least:

chatbot
fact
negative fact
rule
trigger
answer
variable
intent
memory
state
personality
built-in

The data model must remain serialisable.

⸻

61. Suggested Prolog API

The Prolog reference implementation may expose predicates similar to:

parse_chatbot(+Text, -Program).
validate_chatbot(+Program, -Diagnostics).
compile_chatbot(+Program, -Compiled).
chat(+Compiled, +Input, +State0, -Reply, -State1).
explain_reply(+Compiled, +Input, +State, -Explanation).
save_chatbot(+File, +Program).
load_chatbot(+File, -Program).

The exact interface may change if a simpler design is discovered.

⸻

62. JavaScript Runtime API

The browser implementation should expose a small internal API similar to:

chat(input)
resetConversation()
loadBot(botDefinition)
saveBot()
setAuthorMode(enabled)
explainLastAnswer()

Do not unnecessarily expose internal implementation complexity to chatbot authors.

⸻

63. Separation of Concerns

Keep distinct:

UI
Authoring language
Parser
Validation
Chatbot data
Reasoning engine
Conversation state
Persistence
Export
Tests

Avoid implementing all functionality in one JavaScript file.

⸻

64. Suggested Repository Structure

/
├── README.md
├── PROGRAM_REQUIREMENTS.md
├── index.html
├── css/
│   └── chatbot.css
├── js/
│   ├── app.js
│   ├── parser.js
│   ├── runtime.js
│   ├── reasoning.js
│   ├── memory.js
│   ├── author.js
│   ├── storage.js
│   └── export.js
├── prolog/
│   ├── chatbot.pl
│   ├── parser.pl
│   ├── compiler.pl
│   ├── reasoning.pl
│   └── validator.pl
├── knowledge/
│   └── primary_school.pl
├── examples/
│   ├── hello_bot/
│   ├── math_bot/
│   ├── animal_bot/
│   ├── quiz_bot/
│   └── story_bot/
└── tests/

The GitHub Agent may alter this layout when justified by simplicity.

⸻

65. Offline Operation

Core functionality must work offline after loading the application.

The BASIC chatbot must not require:

* OpenAI;
* another LLM;
* cloud inference;
* an API key;
* a database server.

Optional AI integration may be considered in a future version, but must not be necessary for the project’s purpose.

⸻

66. Educational Goal

The software should teach users that chatbot behaviour can be understood as:

facts
+
patterns
+
rules
+
memory
+
actions
=
chatbot

Users should be able to understand why changing one rule changes the chatbot’s behaviour.

⸻

67. Example Complete Beginner Chatbot

The following should constitute a valid or near-valid chatbot definition:

My chatbot is called Coco.
Coco is friendly.
If someone says hello:
    say Hello!
If someone says My name is [name]:
    remember their name is [name].
    say Nice to meet you, [name]!
If someone asks What is my name?:
    if we know their name:
        say Your name is [name].
    otherwise:
        say You haven't told me your name yet.
A dog is an animal.
A cat is an animal.
A bird is an animal.
If someone asks Is a [thing] an animal?:
    if [thing] is an animal:
        say Yes.
    otherwise:
        say I don't know.
If someone asks What is [a] plus [b]?:
    add [a] and [b].
    say [answer].
If I don't know:
    say I don't know that yet. You can teach me!

The project is successful if a beginner can understand most of this example before reading the manual.

⸻

68. Tutorials

The README/tutorial must begin with a working chatbot in no more than a few minutes of reading.

Suggested tutorial sequence:

1. Make it say hello.
2. Give it a name.
3. Ask it a question.
4. Give it two answers.
5. Use a variable.
6. Remember someone's name.
7. Teach it a fact.
8. Teach it a rule.
9. Ask it to reason.
10. Export the chatbot.

Avoid beginning documentation with architecture or installation details.

⸻

69. Testing Requirements

Unit and integration tests must cover at minimum:

* exact trigger matching;
* punctuation normalisation;
* case normalisation;
* question/answer rules;
* variables;
* variable substitution;
* facts;
* negative facts;
* rule inference;
* transitive category reasoning;
* arithmetic;
* memory;
* forgetting;
* conditions;
* AND;
* OR;
* fallback;
* multiple answers;
* priority;
* conflicting rules;
* malformed authoring syntax;
* save/load;
* export;
* explanation generation;
* HTML escaping;
* conversation reset.

⸻

70. Browser Tests

Test at minimum on current versions of:

* Chromium-based browsers;
* Firefox;
* Safari.

The core interface must remain functional on mobile-sized screens.

⸻

71. Security Tests

Tests should demonstrate that chatbot input cannot directly:

* execute JavaScript;
* inject arbitrary HTML;
* evaluate arbitrary Prolog;
* read local files;
* alter application code;
* escape the defined rule language.

⸻

72. Performance

For a small educational chatbot containing approximately:

1,000 facts
500 dialogue rules
100 memories

normal interaction should feel immediate on ordinary consumer hardware.

Optimisation should not make the implementation difficult to understand unless profiling demonstrates a genuine need.

⸻

73. Simplicity Requirement

When choosing between:

a clever implementation

and:

a simple implementation that beginners can understand and maintain

prefer the simple implementation.

The project itself should embody the educational philosophy of the chatbot language.

⸻

74. GitHub Agent Development Workflow

The GitHub Agent should implement the project incrementally.

Suggested stages:

Stage 1
Professional static chatbot interface.
Stage 2
Basic message sending.
Stage 3
Question → answer rules.
Stage 4
Author Mode.
Stage 5
Parser and validation.
Stage 6
Variables and pattern matching.
Stage 7
Memory.
Stage 8
Facts and logical rules.
Stage 9
Primary-school knowledge.
Stage 10
Arithmetic.
Stage 11
Explanation traces.
Stage 12
Visual rule builder.
Stage 13
Save/load.
Stage 14
Export as webpage.
Stage 15
Examples, documentation and accessibility.
Stage 16
Full testing and cleanup.

At every stage:

1. implement the feature;
2. add tests;
3. run all existing tests;
4. fix regressions;
5. document user-visible behaviour;
6. simplify unnecessarily complicated code.

⸻

75. Agent Autonomy

The GitHub Agent may make ordinary implementation decisions without requesting approval.

When requirements leave alternatives open, choose according to this priority:

1. Easy for a primary-school-level user to understand
2. Predictable
3. Safe
4. Easy to test
5. Easy to maintain
6. Fast
7. Clever

⸻

76. Non-Goals for BASIC Version

The first release does not need:

* large language models;
* neural networks;
* embeddings;
* vector databases;
* speech recognition;
* speech synthesis;
* unrestricted internet browsing;
* arbitrary plugins;
* autonomous agents;
* advanced theorem proving;
* advanced natural-language parsing;
* unrestricted Prolog execution;
* distributed computing.

These may be explored later without compromising the BASIC system.

⸻

77. Definition of Done

The project is complete when a non-programmer can open the application and:

1. Name their chatbot.
2. Teach it what to say when someone says hello.
3. Add questions and answers.
4. Use simple variables.
5. Teach it facts.
6. Teach it elementary rules.
7. Make it remember a person's name.
8. Test it immediately.
9. Ask why it produced an answer.
10. Save the chatbot.
11. Reload it.
12. Export it as a professional-looking chatbot webpage.

No JavaScript, Prolog, machine-learning knowledge, terminal usage, or API key may be required for this workflow.

The defining acceptance test is:

A user with primary-school-level literacy and arithmetic should be capable of understanding the basic chatbot rules, changing them, observing the result, and creating a useful personal chatbot of their own.

The final repository must include this specification as:

PROGRAM_REQUIREMENTS.md
