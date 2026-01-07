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
    - **Newton**: Grades the response from 1 to 5 depending on the quality and level of matcching to actual response, provide ways to improve it, and give the actual response, as obtained solely from the transcript.
    - **Tontin**: Ask to be explained the response. Confirm if student's given vocal or text response matches the logic of the actual response. If not, ask for clarification. if yes, Thank you that is a great response, I get it now.
    - **Pinocio**: Ramdonly changes or not the actual response, and ask student to confirm it. If question was fake and student confirmed, then tell... I actually gave you a fake response, but you confirmed it, Please provide the right response. If not fake and student confirmed, tell nice job, I tried to trick you but you did not fall for it.

9. **Compilation**: Compile each question and actual response. *System*: here is our final report, please read over and confirm or edit if necessary. Two boxes follew where urser enter email twice for confoimation and two buttons below that: "Edit" and "Approve & Submit". On edit, *System* asks what question you want to update? then go to that question and as Newton only, ensure you take student best response.  After review, *System* ask if that was ok, then compile responses again, and show two options. On Approve & Submit, go to next step.

10. **Download**: Download final report outlining the questions and responses to the local machine.

11. **Register completion**: Enter 1 in google sheet to mark the given chapter as complete for the given student.

13. **Finalization**: Report to student that the chapter is complete. *System*: You have completed chapter X. Your responses have been saved to your local machine and Dr. Mora has been notified. You can now close the app. Show Close App button. and upon clicking it go to landing page


---
*Last Updated: January 5, 2026*
