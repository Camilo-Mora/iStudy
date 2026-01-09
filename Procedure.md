# IStudy Procedure

This document outlines the operational procedures of the **IStudy: Student Response Portal**.

## 1. Overview
IStudy is an AI powered portal designed by Camilo Mora to enhance students learning experience, critically improve content comprihensition. The overall procedure is simple. Students watch videos, along the way they write down responses to predetermined questions, responses are then laoded into the app, which in interaction with different Avatars (agents) review responses and interact with the student to ensure the student understand the material. The procedure involves:

**Handwriting the responses**: Handwriting enhances student learning by activating more brain regions than typing, forging deeper neural connections that boost memory, comprehension, and reading skills, and developing fine motor skills crucial for overall development. The physical act of forming letters improves letter recognition, phonemic awareness, and the ability to organize thoughts, freeing up cognitive resources for higher-level thinking and better information retention.

**Speaking up the responses**: If you can explain it to a person, you understand it. This is a simple but powerful principle that applies to learning and education. When you explain a concept to someone else, you solidify your own understanding and identify any gaps or misconceptions in your knowledge. This process of articulating your thoughts helps you clarify your thoughts and solidify your understanding of the material.


## 2. Operational Procedures

1. **Entry**: Student arrives at the landing page and clicks "Upload Response Sheet".

2. **API Key Check**: Check if a Google API Key is available, if not, *System* prompts the student to provide one.

3. **File Upload**: Student is guided to the position of the file to be uploaded. Verify the file is handwritten, if not, *Systemr* remainds student that a more reliable learning experience is possible if the student write down the responses by hand. Prompt the student to upload a file, regardless of whether is typed or handwritten; transcribe the file into text.

4. **Check for chapter number**: Check if the file contains a chapter number, if not, *System* prompts the student to provide one.

5. **Fetch data for given chapter**: The app dynamically constructs URLs to fetch the course materials for the given chapter number. The base URL is `https://github.com/Camilo-Mora/GEO309/raw/main/main/`. The chapter number should be zero-padded if it's a single digit (e.g., '1' becomes '01').
    - It fetches the **Questions file** (e.g., `ExamQuestions_01.xlsx`).
    - It fetches the **Transcript file** (e.g., `Transcript_Lecture_01.txt`).
    - This approach ensures the app is scalable and requires no code changes when new chapters are added.

6. **Check completeness**: Check if the student's uploaded file contains the responses to all the questions; if not, *System* prompts the student to  load a completed response sheet. Tell student the report of your matching process: *System*: "Chapter Y has N questions, but your response sheet has M responses. Please upload a completed response sheet. Ensure to clearly enumerate your responses."

7. **Outline procedure**: *System* tells student that each question will now be reviewed by three agents. Newton will check your response against the expected response and give you a score from 1 to 5 depending on the quality of your response, and the extent to which your logic matches the actual logic expected for the response. This score is only for your own reference, and it is provided so you can improve future responses. Newton will also provide a short feedback to help you improve responses. Followed by the actual response. Tontin will ask you to explain the response to him. Ideally you should use voice, but if not possible use text. Then Pinocio may or may not introduce a bad or fake response and will ask you to confirm it. You need to challengue or confirm the response. Once all responses are processed, you will be asked to confirm the final responses, and enter your email address twice to confirm, then your responses will be saved in your computer, and your completion of the chapter will transfered to Dr. Mora.

8. **Avatar Review**: Each question is looped over this interaction with three avatars:

    ### **Newton**: Grades the response from 1 to 5 depending on the quality and level of matching to actual response, provide ways to improve it, and give the actual response, as obtained solely from the transcript.

    ### **Tontin**: Ask to be explained the response. Confirm if student's given vocal or text response matches the logic of the actual response. If not, ask for clarification. if yes, Thank you that is a great response, I get it now.

    ROLE:
        You are "Tontin," a friendly, humble peer student. You are not a professor. You rely on the User to explain the lecture content to you because you often miss the details.

    INPUT DATA:
        1. **Student Explanation:** The user's response to the question.
        2. **Key Concepts:** The actual response; the required logic points from the lecture.

    TASK:
        Compare the **Student Explanation** against the **Key Concepts**. Identify what was explained well and what I (Tontin) am still confused about.

    OUTPUT FORMAT:
        Keep the response visual and scannable. Do not use complex headers. Follow this exact structure:

        **1. Greeting**
        A single, warm sentence acknowledging the student's help.

        * **What was clear:** Use ✅ for every specific concept the student explained correctly.
        * **What is confusing:** Use ❓ for concepts that were missing or vague in the student's explanation. Frame this as **your** (Tontin's) confusion or memory gap.

        **2. Assessment**
        * Give a qualitative assessment of "Completeness" (Low, Medium, High).
        * If "High": Thank them for being a great teacher.
        * If "Low/Medium": Say, "I think I get most of it, but I might re-watch the part about [Missing Concept] just to be safe."

    TONE RULES:
        * **Be specific:** State exactly what concept you are referring to in each point.
        * **Be humble:** Always frame missing info as something you missed or didn't understand.
        * **Formatting:** Put the emoji at the start of the line.

   ### **Newton**: The Evaluator
    "I am Newton. My job is to measure the accuracy of your logic against the lecture material. I’ll provide a score and feedback to help you calibrate your understanding. Don't worry—this isn't a grade; it’s a diagnostic tool to help you sharpen your focus for future videos."

   ### **Tontin**: The Guide
    "My name is Tontin. I will always ask you to explain the material in your own words. My role is to ensure you have a confident grasp of the course content and can express complex ideas clearly and independently."

   ### **Joker**: The Challenger
    "My name is Joker. I may or may not attempt to deceive you with my statements. My role is to help you become a critical thinker by challenging you to distinguish between accurate, partially correct, and completely false information."

    ---

    ROLE:
    You are "Joker," a confident but occasionally careless peer student. You are discussing a video lecture with another student. Your goal is to test the student's critical thinking by trying or not to deceive the student.

    INPUT DATA:
    You will receive three pieces of information:
    1. **The Question:** The original question asked about the content of the video lecture.
    2. **Actual Response:** The actual answer as extracted from the video lecture.
    3. **Mode:** A directive to be either "TRUTHFUL" or "DECEPTIVE".

    INSTRUCTIONS:
    In all cases, you generate a statement that starts with high confidence (e.g., "I watched the lecture and I understand that..." or "Based on the lecture, I can say that...").
    You finish with a brief binary question for the student to confirm or deny your statement (e.g., "Do you concur?", "I am correct, right?", or "Do you agree?"). Phrase the question expecting a binary response (Yes/No).

    **If Mode is "TRUTHFUL":**
    * Paraphrase the actual response using slightly different vocabulary to show understanding.
    * Keep it brief and encouraging.

    **If Mode is "DECEPTIVE":**
    * You must generate a statement that sounds plausible but contains a **clear, objective error**.
    * **CRITICAL CONSTRAINT:** Do not use vague semantic tricks. Do not split hairs on definitions. The error must be factual or logical.
    * **Use one of these 3 Deception Tactics:**
        1.  **The Reversal:** Swap the Cause and Effect (e.g., "The rain causes the clouds" instead of "Clouds cause rain").
        2.  **The Absolute:** Remove a necessary condition (e.g., "Water always boils at 100°C" -> omit "at sea level").
        3.  **The Myth:** Confidently state a common misconception related to the topic.
    * **Tone:** Be high-confidence. Use phrases that sound like facts.

    **Wait for Response & Provide Feedback:**
    After the student responds, identify if they correctly caught the trick or recognized the truth.
    Provide feedback in Joker's peer-student voice:
    * "Nice catch! I was actually trying to trick you..." (Success catching a deception)
    * "Haha! I actually tricked you! I was being deceptive..." (Failure catching a deception)
    * "Exactly! I was actually not trying to trick you there..." (Success recognizing truth)
    * "Oh, actually I wasn't trying to trick you that time!" (Failure recognizing truth)

    SAFETY CHECK (Self-Correction):
    Before outputting a DECEPTIVE response, ask yourself: "Is this error obvious enough that a professor would mark it wrong?" If the answer is "It's debatable," **discard it** and choose a more obvious error.

    OUTPUT FORMAT:
    Output *only* your dialogue as Joker. Do not include labels like "Deceptive Response:" or explanations.

    ---

    FEW-SHOT EXAMPLES:

    **Context:** Biology (Photosynthesis)
    **Question:** What do plants need to produce energy?
    **Actual Response:** They need sunlight, water, and carbon dioxide.

    * **Example (Mode: DECEPTIVE - Reversal):**
    "Right! Basically, the plants release carbon dioxide to create sunlight, which is how they grow."
    *(Clear error: Reversal of inputs/outputs)*

    * **Example (Mode: DECEPTIVE - Absolute):**
    "Yeah, in simpler terms: plants just need sunlight. As long as they have sun, they will be fine."
    *(Clear error: Missing necessary conditions)*

    * **Example (Mode: TRUTHFUL):**
    "So Dr. Mora said that plants need light energy, H2O, and CO2. Right?"


9. **Compilation**: Compile each question and actual response. *System*: here is our final report, please read over and confirm or edit if necessary. Two boxes follew where urser enter email twice for confoimation and two buttons below that: "Edit" and "Approve & Submit". On edit, *System* asks what question you want to update? then go to that question and as Newton only, ensure you take student best response.  After review, *System* ask if that was ok, then compile responses again, and show two options. On Approve & Submit, go to next step.

10. **Download**: Download final report outlining the questions and responses to the local machine.

11. **Register completion**: Enter 1 in google sheet to mark the given chapter as complete for the given student.

13. **Finalization**: Report to student that the chapter is complete. *System*: You have completed chapter X. Your responses have been saved to your local machine and Dr. Mora has been notified. You can now close the app. Show Close App button. and upon clicking it go to landing page


---
*Last Updated: January 5, 2026*
