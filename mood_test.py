from deepface import DeepFace
import cv2
import time
import numpy as np

# Use OpenCV to grab frames from your webcam
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1200)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
time.sleep(1)  # Give camera time to warm up

print("Detecting emotions... Press 'q' to quit")

frame_count = 0
current_emotion = "Waiting..."
emotion_scores = {}

while True:
    ret, frame = cap.read()
    
    if not ret or frame is None:
        print("Error: Could not capture frame")
        break
    
    frame_count += 1
    
    # Analyze every 3 frames to improve performance
    if frame_count % 3 == 0:
        try:
            # Analyze the frame for emotion
            results = DeepFace.analyze(frame, actions=['emotion'], enforce_detection=False)
            current_emotion = results[0]['dominant_emotion'].upper()
            emotion_scores = results[0]['emotion']
        except Exception as e:
            current_emotion = "Error detecting"
            emotion_scores = {}
    
    # Add dark background for text visibility
    overlay = frame.copy()
    cv2.rectangle(overlay, (10, 10), (frame.shape[1] - 10, 250), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.3, frame, 0.7, 0, frame)
    
    # Display main emotion (large)
    cv2.putText(frame, f"EMOTION: {current_emotion}", (30, 80), 
               cv2.FONT_HERSHEY_SIMPLEX, 2.5, (0, 255, 0), 4)
    
    # Display emotion scores
    y_offset = 140
    for emotion_type, score in sorted(emotion_scores.items(), key=lambda x: x[1], reverse=True):
        # Create a bar graph for each emotion
        bar_width = int(score / 100 * 200)
        cv2.rectangle(frame, (250, y_offset - 15), (250 + bar_width, y_offset), (255, 255, 0), -1)
        
        text = f"{emotion_type}: {score:.1f}%"
        cv2.putText(frame, text, (30, y_offset), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
        y_offset += 35
    
    # Add instructions
    cv2.putText(frame, "Press 'q' to quit", (frame.shape[1] - 350, frame.shape[0] - 20), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 200), 2)
    
    # Display the frame
    cv2.imshow("Emotion Detection - Move Your Face", frame)
    
    # Press 'q' to exit
    if cv2.waitKey(1) & 0xFF == ord('q'):
        print("Exiting...")
        break

cap.release()
cv2.destroyAllWindows()
print("Done!")