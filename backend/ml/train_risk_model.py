import os
import json
import sqlite3
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'django', 'db.sqlite3')
MODEL_OUTPUT = os.path.join(os.path.dirname(__file__), 'risk_model.joblib')
SUMMARY_OUTPUT = os.path.join(os.path.dirname(__file__), 'risk_summary.json')

def load_data_from_db():
    conn = sqlite3.connect(DB_PATH)
    
    # 1. Fetch Students
    students_df = pd.read_sql_query("""
        SELECT u.id as user_id, u.first_name, u.last_name, u.email,
               p.roll_number, p.department, p.year, p.semester, p.cgpa
        FROM accounts_user u
        JOIN accounts_studentprofile p ON u.id = p.user_id
        WHERE u.role = 'student'
    """, conn)

    # 2. Fetch Attendance
    att_df = pd.read_sql_query("""
        SELECT student_id, status FROM courses_attendance
    """, conn)
    
    if not att_df.empty:
        att_stats = att_df.groupby('student_id')['status'].agg(
            total_sessions='count',
            present_sessions=lambda s: (s == 'present').sum()
        ).reset_index()
        att_stats['attendance_percentage'] = (att_stats['present_sessions'] / att_stats['total_sessions'] * 100).round(2)
    else:
        att_stats = pd.DataFrame(columns=['student_id', 'total_sessions', 'present_sessions', 'attendance_percentage'])

    # 3. Fetch Assignments
    assign_df = pd.read_sql_query("""
        SELECT student_id, marks_obtained FROM assignments_submission
    """, conn)
    
    if not assign_df.empty:
        assign_stats = assign_df.groupby('student_id')['marks_obtained'].agg(
            submitted_count='count',
            avg_assignment_score='mean'
        ).reset_index()
    else:
        assign_stats = pd.DataFrame(columns=['student_id', 'submitted_count', 'avg_assignment_score'])

    # 4. Fetch Exam Marks
    exam_df = pd.read_sql_query("""
        SELECT student_id, marks_obtained FROM courses_exammark
    """, conn)

    if not exam_df.empty:
        exam_stats = exam_df.groupby('student_id')['marks_obtained'].agg(
            avg_exam_score='mean'
        ).reset_index()
    else:
        exam_stats = pd.DataFrame(columns=['student_id', 'avg_exam_score'])

    conn.close()

    # Merge Data
    merged = pd.merge(students_df, att_stats, left_on='user_id', right_on='student_id', how='left')
    merged = pd.merge(merged, assign_stats, left_on='user_id', right_on='student_id', how='left')
    merged = pd.merge(merged, exam_stats, left_on='user_id', right_on='student_id', how='left')

    # Fill defaults for realistic student baseline
    np.random.seed(42)
    merged['total_sessions'] = merged['total_sessions'].fillna(10).astype(int)
    merged['present_sessions'] = merged['present_sessions'].fillna(pd.Series(np.random.randint(5, 11, size=len(merged)), index=merged.index)).astype(int)
    merged['attendance_percentage'] = (merged['present_sessions'] / merged['total_sessions'] * 100).round(2)
    
    merged['submitted_count'] = merged['submitted_count'].fillna(pd.Series(np.random.randint(1, 6, size=len(merged)), index=merged.index)).astype(int)
    merged['avg_assignment_score'] = merged['avg_assignment_score'].fillna(pd.Series(np.random.uniform(50.0, 95.0, size=len(merged)), index=merged.index)).round(2)
    merged['avg_exam_score'] = merged['avg_exam_score'].fillna(pd.Series(np.random.uniform(45.0, 90.0, size=len(merged)), index=merged.index)).round(2)
    merged['cgpa'] = merged['cgpa'].fillna(8.0).astype(float)
    merged['year'] = merged['year'].fillna(1).astype(int)
    merged['semester'] = merged['semester'].fillna(1).astype(int)

    # Label: At Risk (1) if attendance < 75 OR avg_exam_score < 50, else Safe (0)
    merged['is_at_risk'] = np.where((merged['attendance_percentage'] < 75.0) | (merged['avg_exam_score'] < 50.0), 1, 0)

    return merged

def train_and_evaluate():
    df = load_data_from_db()
    
    # Feature columns
    feature_cols = [
        'attendance_percentage',
        'total_sessions',
        'submitted_count',
        'avg_assignment_score',
        'avg_exam_score',
        'year',
        'semester'
    ]

    X = df[feature_cols]
    y = df['is_at_risk']

    # Train / Test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y if len(np.unique(y)) > 1 else None)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 1. Random Forest
    rf = RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42)
    rf.fit(X_train_scaled, y_train)
    rf_preds = rf.predict(X_test_scaled)
    rf_probs = rf.predict_proba(X_test_scaled)[:, 1] if hasattr(rf, "predict_proba") else rf_preds

    # 2. K-Nearest Neighbors (KNN)
    knn = KNeighborsClassifier(n_neighbors=min(5, len(X_train)))
    knn.fit(X_train_scaled, y_train)
    knn_preds = knn.predict(X_test_scaled)

    # 3. Logistic Regression
    lr = LogisticRegression(random_state=42)
    lr.fit(X_train_scaled, y_train)
    lr_preds = lr.predict(X_test_scaled)

    # Compute metrics
    def calc_metrics(y_true, y_pred):
        acc = accuracy_score(y_true, y_pred)
        prec = precision_score(y_true, y_pred, zero_division=0)
        rec = recall_score(y_true, y_pred, zero_division=0)
        f1 = f1_score(y_true, y_pred, zero_division=0)
        cm = confusion_matrix(y_true, y_pred).tolist()
        return {
            "accuracy": round(float(acc) * 100, 2),
            "precision": round(float(prec) * 100, 2),
            "recall": round(float(rec) * 100, 2),
            "f1_score": round(float(f1) * 100, 2),
            "confusion_matrix": cm
        }

    rf_metrics = calc_metrics(y_test, rf_preds)
    knn_metrics = calc_metrics(y_test, knn_preds)
    lr_metrics = calc_metrics(y_test, lr_preds)

    # Feature Importance (Random Forest)
    importances = dict(zip(feature_cols, rf.feature_importances_.round(4).tolist()))

    # Individual Student Predictions
    X_full_scaled = scaler.transform(X)
    df['risk_probability'] = (rf.predict_proba(X_full_scaled)[:, 1] * 100).round(1)
    df['predicted_risk_level'] = np.where(
        df['risk_probability'] >= 65, 'High Risk',
        np.where(df['risk_probability'] >= 35, 'Moderate Risk', 'Safe')
    )

    student_predictions = df[[
        'user_id', 'first_name', 'last_name', 'email', 'roll_number', 'department',
        'attendance_percentage', 'avg_exam_score', 'avg_assignment_score',
        'risk_probability', 'predicted_risk_level'
    ]].to_dict(orient='records')

    # Save artifacts
    artifacts = {
        'rf_model': rf,
        'knn_model': knn,
        'lr_model': lr,
        'scaler': scaler,
        'feature_cols': feature_cols
    }
    os.makedirs(os.path.dirname(MODEL_OUTPUT), exist_ok=True)
    joblib.dump(artifacts, MODEL_OUTPUT)

    summary_data = {
        'model_metrics': {
            'random_forest': rf_metrics,
            'knn': knn_metrics,
            'logistic_regression': lr_metrics
        },
        'feature_importances': importances,
        'total_students_evaluated': len(df),
        'high_risk_count': int((df['predicted_risk_level'] == 'High Risk').sum()),
        'moderate_risk_count': int((df['predicted_risk_level'] == 'Moderate Risk').sum()),
        'safe_count': int((df['predicted_risk_level'] == 'Safe').sum()),
        'students': student_predictions
    }

    with open(SUMMARY_OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(summary_data, f, indent=2)

    print("[OK] Model training completed successfully!")
    print(f"[OK] Random Forest Accuracy: {rf_metrics['accuracy']}%")
    print(f"[OK] KNN Accuracy: {knn_metrics['accuracy']}%")
    print(f"[OK] Logistic Regression Accuracy: {lr_metrics['accuracy']}%")
    print(f"[OK] Saved model artifacts to {MODEL_OUTPUT}")

if __name__ == '__main__':
    train_and_evaluate()
