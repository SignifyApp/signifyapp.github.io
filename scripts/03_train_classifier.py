import os
import pickle
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, classification_report
from inference_classifier import GestureClassifier

# Adjust the path to load data.pickle
current_dir = os.path.abspath(os.path.dirname(__file__))
data_path = os.path.join(current_dir, "../data.pickle")

# Load your training data
data_dict = pickle.load(open(data_path, "rb"))

# Ensure all sublists have the same length by padding with zeros
max_length = max(len(sublist) for sublist in data_dict["data"])
data_padded = [
    sublist + [0] * (max_length - len(sublist)) for sublist in data_dict["data"]
]

data = np.asarray(data_padded)
labels = np.asarray(data_dict["labels"])

# Use stratified train-test split
x_train, x_test, y_train, y_test = train_test_split(
    data, labels, test_size=0.2, shuffle=True, stratify=labels, random_state=42
)

model = RandomForestClassifier()

# Use cross-validation for evaluation
cv_scores = cross_val_score(model, data, labels, cv=5, scoring="accuracy")
print("Cross-Validation Scores:", cv_scores)
print("Mean Accuracy:", np.mean(cv_scores))

# Fit the model on the entire training set
model.fit(x_train, y_train)

# Make predictions on the test set
y_predict = model.predict(x_test)

# Evaluate performance
score = accuracy_score(y_test, y_predict)
print("Accuracy: {:.2f}% of samples were classified correctly!".format(score * 100))

# Display additional metrics
print("Classification Report:\n", classification_report(y_test, y_predict))

# Save the model using pickle
gesture_classifier = GestureClassifier()
gesture_classifier.model = model
gesture_classifier.model_dict = {"model": model}

model_path = os.path.join(current_dir, "../model.p")
with open(model_path, "wb") as f:
    pickle.dump(gesture_classifier.model_dict, f)
