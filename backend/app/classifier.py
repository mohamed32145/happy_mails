import numpy as np
import pandas as pd
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Embedding



df = pd.read_excel(r'C:\Users\moham\OneDrive - University of Haifa\study\now\project\my-chrome-extension - Copy - 2\backend\app\data\Emails.xlsx')


# Sample emails and labels
#emails = ['Rude email here!', 'This is a respectful email.', 'Please stop this nonsense!']
#labels = [0, 1, 0]  # 0: rude, 1: decent
emails = df.Email[:]
labels = df.Formality[:]



# Tokenizing the emails
tokenizer = Tokenizer()
tokenizer.fit_on_texts(emails)
X = tokenizer.texts_to_sequences(emails)
X = pad_sequences(X)

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, labels, test_size=0.2)

y_train = np.array(y_train)
y_test = np.array(y_test)



# LSTM Model
model = Sequential()
model.add(Embedding(input_dim=5000, output_dim=64, input_length=X.shape[1]))
model.add(LSTM(64))
model.add(Dense(1, activation='sigmoid'))

model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

# Train the model
model.fit(X_train, y_train, epochs=5, batch_size=32)


# Save the model and tokenizer
model_save_path = 'backend/app/data/email_classifier_model.h5'
model.save(model_save_path)

# Save the tokenizer as well using pickle
import pickle
with open('backend/app/data/tokenizer.pkl', 'wb') as f:
    pickle.dump(tokenizer, f)
