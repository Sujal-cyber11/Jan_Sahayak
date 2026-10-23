# SEVA FIRST INNOVATION CHALLENGE 2026
## Project Proposal: JanSahayak AI
**Tagline: “Har Haq Tak, Aasaan Raasta.”**

### 1. Project Overview
JanSahayak AI is a software-based, AI-powered citizen assistance platform designed to help people discover relevant government welfare schemes, understand their eligibility, prepare required documents, and navigate the application process.

Our goal is not just to show users a list of government schemes, but to guide them from discovering a potential benefit to becoming ready to apply for it.

The platform will support a simple, multilingual experience, initially focusing on Hindi and English, so that users with limited technical knowledge can use it easily.

### 2. Problem Statement
India has numerous central and state government welfare schemes for students, farmers, women, workers, rural households, and economically weaker sections.

However, citizens may face several challenges:
- They may not know which schemes are relevant to their situation.
- Eligibility criteria can be difficult to understand.
- They may be unaware of the documents required for an application.
- They may struggle to find the correct official application portal.
- They may not understand why they do not qualify for a particular scheme.
- They may miss other potentially relevant benefits because they are searching for only one scheme.

These challenges can make accessing public welfare information confusing and time-consuming.

### 3. Proposed Solution
JanSahayak AI will provide a unified platform that converts verified government scheme information into personalised and actionable guidance.

Users will create a basic profile by entering relevant information such as:
- State of residence
- Age group
- Education level
- Occupation
- Income range
- Relevant household or beneficiary details, where required

Based on the available information, the platform will identify potentially relevant schemes, evaluate eligibility against structured rules, explain missing information, generate a document checklist, and provide official application links.

The system will clearly distinguish between eligible, ineligible, and uncertain cases. It will never guarantee approval or eligibility when the available information is insufficient.

### 4. Core Features

**Feature 1: Smart Scheme Discovery**
- Matches user profiles with relevant schemes.
- Filters schemes by state, category, education, occupation, and other applicable criteria.
- Displays scheme benefits, eligibility conditions, and official sources.
- Prioritises relevance rather than simply displaying a long list.

**Feature 2: Explainable AI Eligibility Engine**
- Checks each available eligibility criterion separately.
- Displays Pass, Fail, or Information Required.
- Explains why a scheme may or may not fit the user's profile.
- Identifies the specific information needed to complete an assessment.

Example: “Your education level matches the requirement, but your income details are missing. Provide the required information to complete the assessment.”

The actual eligibility decision will be calculated using verified rules, not left entirely to the AI model.

**Feature 3: Smart Document Readiness Tracker**
- Generates a checklist of documents required for a selected scheme.
- Allows users to mark documents as available, missing, or needing verification.
- Calculates a document checklist completion percentage.
- Explains possible official routes for obtaining missing documents.
- Helps users prepare before visiting an application portal.

The completion percentage will indicate checklist progress, not the probability of application approval.

**Feature 4: What-If Eligibility Simulator**
- Allows users to change relevant profile details in a test scenario.
- Shows which eligibility results change when an input changes.
- Explains which criteria are responsible for the difference.
- Helps users understand scheme rules before proceeding.

This feature will explain rules, not encourage users to misrepresent their actual information.

**Feature 5: AI Citizen Assistant**
- Answers scheme-related questions in simple Hindi and English.
- Explains complex government terminology in accessible language.
- Answers questions about benefits, eligibility, required documents, and application steps.
- Uses retrieved information from verified sources.
- Provides source links and the date on which information was last verified.
- Acknowledges uncertainty when reliable information is unavailable.

**Feature 6: Alternative Scheme Recommendations**
- Suggests other relevant schemes when a selected scheme does not match the user's profile.
- Explains the important differences between the schemes.
- Shows which criteria are satisfied and which remain uncertain.
- Helps users discover alternatives they might otherwise overlook.

**Feature 7: Application Guidance**
- Provides a step-by-step checklist for the next stage of the application.
- Displays the official application link and relevant department information.
- Helps users keep track of preparation progress.
- Allows users to save their checklist for later.

The initial prototype will guide users to official portals rather than claiming to submit government applications directly.

**Feature 8: Scheme Information Verification**
- Stores the official source for each scheme.
- Records the last verification date.
- Flags information that requires rechecking.
- Prevents the AI assistant from presenting unsupported claims as confirmed facts.

### 5. What Makes JanSahayak AI Innovative?
Many platforms help citizens discover government schemes. Our proposed differentiation is the integration of scheme discovery, explainable eligibility assessment, document readiness, what-if analysis, and evidence-backed guidance into one workflow.

The key innovation is the **Benefit Readiness Engine**.

Instead of simply answering “Which scheme is available?”, it aims to answer three practical questions:

1. Which schemes may be relevant to me?
2. What information or documents am I missing?
3. What should I do next, and where can I verify it?

We will demonstrate this difference through real test scenarios and measured results rather than relying only on claims of innovation.

### 6. Proposed User Workflow
Step 1: The user opens JanSahayak AI and chooses Hindi or English.

Step 2: The user completes a short profile questionnaire.

Step 3: The system matches the profile against available verified scheme records.

Step 4: The eligibility engine evaluates individual criteria.

Step 5: The user sees relevant schemes with explanations and official references.

Step 6: The user selects a scheme and opens the document readiness checklist.

Step 7: The AI assistant answers questions using available verified scheme information.

Step 8: The platform provides the next steps and official application link.

Step 9: The user can save the checklist and return to track preparation progress.

### 7. Technology Stack

**Frontend**
- React
- TypeScript
- Vite
- Tailwind CSS

Purpose: Responsive user interface, profile questionnaire, scheme results, eligibility explanations, and document tracking.

**Backend**
- Python
- FastAPI

Purpose: API development, profile validation, scheme matching, eligibility calculations, and AI integration.

**Database**
- PostgreSQL or Supabase

Purpose: Scheme records, structured eligibility criteria, required documents, source references, and saved user progress.

**AI Integration**
- Groq API
- Retrieval-Augmented Generation (RAG)
- Structured prompts and source-grounded responses

Purpose: Natural-language questions, simplified explanations, and multilingual assistance.

The language model will explain verified information. Deterministic backend rules will handle eligibility calculations.

**Deployment**
- Vercel for the frontend
- A suitable cloud host for the FastAPI backend
- PostgreSQL/Supabase for persistent data

### 8. Data Sources
The platform will prioritise information from:
- myScheme — Government scheme discovery
- National Portal of India
- Relevant central government ministry websites
- State government department websites
- Official application portals
- Relevant public datasets where available

Each scheme record should contain its official source URL, eligibility criteria, required documents, benefits, application instructions, applicable state or region, and verification date.

We will begin with a manageable dataset of approximately 10–20 schemes rather than attempting to cover every government scheme in the first version.

### 9. Database Structure
The proposed database will include:

1. Schemes: Name, category, state, benefits, eligibility summary, official URL.
2. Eligibility Rules: Scheme ID, criterion, operator, threshold, explanation.
3. Required Documents: Scheme ID, document name, instructions.
4. Source Records: Source URL, last verification date, version.
5. User Profiles: Minimum necessary profile information.
6. Saved Progress: User ID, scheme ID, checklist status, progress.

The system will avoid collecting unnecessary sensitive information and will use fictional profiles for demonstrations.

### 10. Seven-Day Development Plan

**Day 1 — Foundation**
- Finalise the problem statement and target users.
- Create the React project and FastAPI backend.
- Design the landing page, profile questionnaire, and dashboard.
- Create the initial database schema.

**Day 2 — Scheme Dataset**
- Collect 10–20 relevant scheme records.
- Verify official URLs and eligibility conditions.
- Add document requirements and application instructions.
- Store the information in structured form.

**Day 3 — Eligibility Engine**
- Implement the rule-based matching system.
- Add Pass, Fail, and Information Required results.
- Write test cases for eligibility conditions.
- Connect the results to the frontend.

**Day 4 — Document Readiness**
- Build interactive document checklists.
- Add completion tracking.
- Implement alternative scheme matching.
- Display application instructions and official links.

**Day 5 — AI Assistant**
- Integrate the AI API.
- Implement retrieval from approved scheme information.
- Add citations and uncertainty handling.
- Test Hindi and English questions.

**Day 6 — Testing and Refinement**
- Test incomplete profiles and conflicting information.
- Check eligibility calculations against verified rules.
- Fix frontend and backend integration issues.
- Improve accessibility, responsive design, and error handling.

**Day 7 — Deployment and Presentation**
- Deploy the frontend and backend.
- Test the live application.
- Prepare sample user profiles.
- Create the architecture diagram and pitch deck.
- Rehearse a complete end-to-end demonstration.

This is a proposed timeline; the final scope will depend on the team size and actual implementation progress.

### 11. Team Responsibilities
The exact allocation can be adjusted according to the number of team members.

- Frontend Developer: UI, profile wizard, dashboard, scheme cards, and checklist.
- Backend Developer: APIs, database integration, and eligibility engine.
- AI Developer: RAG, prompts, source-grounded responses, and multilingual assistance.
- Research and Data Lead: Official scheme research, rule verification, and dataset preparation.
- Testing and Presentation Lead: Test cases, user experience, demo scenarios, documentation, and pitch deck.

Team members can share responsibilities where needed.

### 12. Success Metrics
We will evaluate the prototype using measurable indicators:
- Accuracy of the eligibility engine on verified test cases.
- Percentage of AI answers supported by valid sources.
- Correctness of displayed official links.
- Time required for a user to identify a relevant scheme.
- Percentage of test users who understand the next application steps.
- Number of scheme records with complete, verified information.

Results will be measured during testing; we will not claim unverified impact figures.

### 13. Risks and Mitigation
- Outdated information: Store verification dates and recheck official sources.
- Incorrect AI answers: Use source-grounded retrieval and deterministic eligibility rules.
- Incomplete profiles: Show uncertainty and request missing information.
- Privacy risks: Collect minimal data and avoid unnecessary document uploads.
- Scope creep: Build the core workflow first and add advanced features only after testing.
- Existing competition: Clearly demonstrate the benefit-readiness workflow rather than claiming to be the first scheme discovery platform.

### 14. Expected Outcome
The expected outcome is a working, software-only prototype that demonstrates how AI and structured data can make government scheme information easier to understand and act upon.

The project will focus on accessibility, explainability, data reliability, and practical citizen benefit.

### Final Vision
JanSahayak AI aims to reduce the gap between the availability of public welfare information and a citizen's ability to understand and act on it.

**“Har Haq Tak, Aasaan Raasta.”**

Let's review the official SEVA problem statements, agree on the initial scope, divide responsibilities, and build a working prototype that we can demonstrate and validate.