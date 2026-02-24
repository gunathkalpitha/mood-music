from deepface import DeepFace
import cv2
import time
import numpy as np
import requests
import base64
import webbrowser

# Backend API endpoint
API_URL = "http://127.0.0.1:8002/detect-mood"

# Use OpenCV to grab frames from your webcam
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1200)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
time.sleep(1)  # Give camera time to warm up

print("Detecting emotions and suggesting music... Press 'q' to quit, 'space' to play suggested track")

frame_count = 0
current_emotion = "Waiting..."
emotion_scores = {}
suggested_tracks = []
last_api_call = 0

while True:
    ret, frame = cap.read()
    
    if not ret or frame is None:
        print("Error: Could not capture frame")
        break
    
    frame_count += 1
    
    # Analyze every 30 frames (1 second at 30fps) and call API
    if frame_count % 30 == 0 and time.time() - last_api_call > 3:
        try:
            # Encode frame to base64
            _, buffer = cv2.imencode('.jpg', frame)
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            
            # Call backend API
            response = requests.post(API_URL, json={"image": img_base64}, timeout=5)
            if response.status_code == 200:
                data = response.json()
                current_emotion = data['emotion'].upper()
                emotion_scores = data['scores']
                suggested_tracks = data['tracks']
                last_api_call = time.time()
                print(f"\n{'='*70}")
                print(f"Emotion: {current_emotion}, Tracks found: {len(suggested_tracks)}")
                if suggested_tracks:
                    print(f"Press SPACE or 1/2/3 to play a track:")
                    for i, track in enumerate(suggested_tracks[:3], 1):
                        print(f"  {i}. {track['title']}")
                        print(f"     {track['youtube_url']}")
                print(f"{'='*70}\n")
        except Exception as e:
            print(f"API Error: {e}")
            current_emotion = "Error connecting to API"
            emotion_scores = {}
    
    # Add dark background for text visibility
    overlay = frame.copy()
    cv2.rectangle(overlay, (10, 10), (frame.shape[1] - 10, 400), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.3, frame, 0.7, 0, frame)
    
    # Display main emotion (large)
    cv2.putText(frame, f"EMOTION: {current_emotion}", (30, 60), 
               cv2.FONT_HERSHEY_SIMPLEX, 1.8, (0, 255, 0), 3)
    
    # Display emotion scores
    y_offset = 110
    for emotion_type, score in sorted(emotion_scores.items(), key=lambda x: x[1], reverse=True)[:4]:
        # Create a bar graph for each emotion
        bar_width = int(score / 100 * 150)
        cv2.rectangle(frame, (200, y_offset - 12), (200 + bar_width, y_offset), (255, 255, 0), -1)
        
        text = f"{emotion_type}: {score:.1f}%"
        cv2.putText(frame, text, (30, y_offset), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        y_offset += 30
    
    # Display suggested tracks
    if suggested_tracks:
        y_offset += 20
        cv2.putText(frame, "Suggested Music:", (30, y_offset), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        y_offset += 30
        
        for i, track in enumerate(suggested_tracks[:3]):
            track_text = f"{i+1}. {track['title'][:50]}"
            cv2.putText(frame, track_text, (30, y_offset), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            y_offset += 25
    
    # Add instructions
    cv2.putText(frame, "Press 'q' to quit | SPACE/1/2/3 to play tracks", 
               (30, frame.shape[0] - 20), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2)
    
    # Display the frame
    cv2.imshow("AI Music Selection - Emotion Detection", frame)
    
    # Handle key presses
    key = cv2.waitKey(1) & 0xFF
    if key == ord('q'):
        print("Exiting...")
        break
    elif key == ord(' ') and suggested_tracks:  # Space bar
        # Open first track in browser
        url = suggested_tracks[0]['youtube_url']
        print(f"Opening: {suggested_tracks[0]['title']}")
        webbrowser.open(url)
    elif key in [ord('1'), ord('2'), ord('3')]:  # Hotkeys for tracks 1-3
        track_idx = int(chr(key)) - 1  # Convert '1' to 0, '2' to 1, '3' to 2
        if track_idx < len(suggested_tracks):
            url = suggested_tracks[track_idx]['youtube_url']
            print(f"Opening track {track_idx + 1}: {suggested_tracks[track_idx]['title']}")
            webbrowser.open(url)

cap.release()
cv2.destroyAllWindows()
print("Done!")
