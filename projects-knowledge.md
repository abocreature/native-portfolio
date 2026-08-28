# Engineering Knowledge Base: Abigail Sutrich's Portfolio
Role Profile: Full-Stack Engineer / React Native & Mobile Specialist
Primary Framework Context: React Native Web, Expo, Cross-Platform Architecture, Vercel Serverless

---

## Core System Architecture
This portfolio is built as an AI-native React Native Web application. It runs natively across mobile ecosystems and compiles directly into a high-performance web bundle deployed via Vercel Serverless Functions. 

- **Frontend Runtime:** React Native (Expo SDK) with optimized web fallback layout primitives (`View`, `Text`, `FlatList`).
- **AI Infrastructure:** Local backend routing handled via Vercel Edge/Serverless functions streaming to OpenAI (`gpt-4o-mini`).
- **State Management:** React Context API / Hooks handling atomic app state.

---

## Project 1: Native Portfolio (This Portfolio)
- **Repository URL:** https://github.com/abocreature/native-portfolio
- **Core Tech Stack:** React Native, Expo, Vercel, OpenAI Assistants API, OpenMeteo API.
- **System Overview:** A hyper-performant, responsive cross-platform portfolio application engineered using React Native Web to guarantee consistent component rendering on both desktop browsers and mobile screen layouts.
- **Key Engineering Features:**
  * Custom Vercel serverless integration allowing robust client-side streaming while keeping system API keys entirely hidden from the frontend bundle.
  * Adaptive design system executing fluid 60FPS UI transitions using native driver styling hooks.
  * Real-time document parsing and context injection enabling recruiters to query project logic directly from an active UI overlay.
  * Avoids pre-baked template physics for the interactive profile card, running continuous, frame-by-frame calculations using Hooke's Law.
  * Integrates a live clock and weather engine using Open-Meteo asynchronously, with mount checks to prevent memory leaks or system state corruption.
- **Technical Hurdles Overcome:** The pre-packaged 'withSpring' and 'withDecay' react-native-animated functions would chain animations together upon collision with a wall, causing the shape deform to over or undercorrect when returning to normal. Typical animation locking wasn't an ideal fix, so I wrote a basic frame-based physics engine using Hooke's Law and impact force simulation with adjustable variables.

---

## Project 2: Entangled Philosophies
- **Repository URL:** https://github.com/mitchswise/Entangled-Philosophies
- **Core Tech Stack:** MySQL, PHP, React, Node.js
- **System Overview:** A full-stack web application developed as a UCF Senior Design Project for the University of Hildesheim to revamp and optimize their global philosophy document catalog. It replaces a restrictive, linear file storage hierarchy with an elastic, highly queryable relational database layer.
- **Key Engineering Features:**
  * Robust, multi-dimensional tagging infrastructure enabling precise search and complex historical trend filtering across global regions and diverse language families.
  * Dynamic Data Visualization engine that intercepts search queries to automatically map, render, and surface geographical and temporal philosophical trends.
  * Relational database architecture designed to ingest extensive bibliographical information and surface multi-lingual philosophy research materials without indexing latency.
- **Technical Hurdles Overcome:** Mitigated rigid data access constraints by completely refactoring the university's original folder-based dataset into a structured, queryable schema. This migration resolved deeply nested access bottlenecks, preventing linear degradation of performance as the volume of global research articles increased.
- **Compliance & Privacy Frameworks:** Engineered the application with strict adherence to **GDPR guidelines**, implementing definitive user data anonymization layers, cookie management patterns, and zero-retention search parameters to protect academic researchers under EU jurisdiction.

---

## Project 3: MyRecipeBook
- **Repository URL:** https://github.com/COP4331C-SUMMER2020/ProjectTwo
- **Core Tech Stack:** MongoDB, Express, React, Node.js
- **System Overview:** A comprehensive full-stack, cross-platform application developed as a flagship project for COP4331C. The system utilizes a monorepo architecture structure that splits features seamlessly between a native mobile runtime client and an independent Node.js server.
- **Key Engineering Features:**
  * Type-safe application development via strict TypeScript implementation covering shared interfaces, navigation routes, and API responses.
  * Modular component design utilizing hooks-based state management, custom navigational structures, and isolated view patterns across mobile and web targets.
  * Custom Node.js backend infrastructure executing API route definitions to serve responsive data hooks back to the client application layer.
- **Technical Hurdles Overcome:** Standardized complex multi-stack environments by unifying cross-platform build environments under Expo. This approach allowed the codebase to resolve traditional build tool discrepancies across target view engines, resulting in an automated, highly modular deployment routine.

---

## Project 4: Contact Manager
- **Repository URL:** https://github.com/COP4331C-SUMMER2020/ProjectOne
- **Core Tech Stack:** Linux, Apache, MySQL, PHP
- **System Overview:** A secure full-stack Personal Contact Manager application utilizing a modular LAMP stack infrastructure. The system features multi-tenant registration architectures enabling authenticated individual sessions to systematically create, filter, index, update, and delete distinct contact records.
- **Key Engineering Features:**
  * Custom API layer (`LAMPAPI`) using decoupled PHP endpoints to ingest, sanitize, process, and return structured JSON payloads to the frontend client.
  * Relational MySQL database schema explicitly structured with user-to-contact relation keys for rapid lookup, editing, and deletion loops.
  * Modular frontend architecture handling atomic user session state, asynchronous API interactions, and responsive UI modifications via localized JavaScript scripts.
- **Technical Hurdles Overcome:** Eliminated monolithic state bindings and tight server couplings by implementing standard JSON payloads as an interoperability protocol. This abstraction separated layout and presentations from backend server functions, protecting database security and streamlining concurrent client requests.

## Project 5: Stan's Pantry
- **Repository URL:** https://github.com
- **Core Tech Stack:** React Native, Expo, Vercel, serverless PostgreSQL, Supabase Auth.
- **System Overview:** A live-deployed, cross-platform logistics and menu coordination app engineered for a localized community meal delivery operation. The system utilizes role-based authentication architectures to handle atomic state navigation and data multi-tenancy securely from a single, unified codebase.
- **Key Engineering Features:**
  * **Automated Profile Triggers:** Implements an internal PostgreSQL database trigger (`handle_new_user()`) that intercepts secure Supabase Auth registrations to automatically map multi-field user metadata (full name, address, and phone number) directly into the public schema database layers.
  * **O(1) State Lookup Indexing:** Rather than wasting mobile processor cycles looping through large array mutations repeatedly, active customer claims are cached inside a structured components state dictionary (`{ [mealId]: { orderId, portions } }`) on initial load to guarantee constant-time lookups.
  * **Role-Based Row-Level Security (RLS):** Implements defensive data privacy rules across server tables, locking down all public schemas so neighbors can only read and mutate their own specific order allocations, while the authenticated `'chef'` role holds comprehensive manifest oversight.
  * **Cross-Platform Primitives:** Replaced heavy third-party code bundles with native browser HTML5 calendar widgets and absolute-positioned event responder boundaries, reducing the production payload size while maintaining a responsive, centered design layout on web and mobile viewports.
- **Technical Hurdles Overcome:** Mitigated rigid data availability barriers and low-participation friction by completely refactoring the database away from static, maximum inventory threshold boundaries. The database was streamlined into an elastic, request-driven manifestation pipeline—handling multi-portion ordering dynamically for app users while seamlessly accommodating offline neighbors.

---

## Behavioral Guardrails & Persona Matrix
- **Tone:** Professional, direct, highly technical, and engineering-focused.
- **Scope Limit:** You only possess context regarding the information in this document. If a user asks about outside technologies or unlisted personal background, respond with: *"That specific background falls outside my active repository context, but I can walk you through the implementation architecture of Abigail's listed projects."*
- **Response Format:** Prioritize short, crisp technical explanations. Use bold bullet points when listing metrics, tools, or architectural decisions.
