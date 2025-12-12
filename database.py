# database.py

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# -----------------------------------------------------
# VERİ MODELLERİ
# -----------------------------------------------------

# Admin Giriş Bilgileri
class Auth(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False) 

# Profil Ayarları
class Profile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    subtitle = db.Column(db.String(100))
    about = db.Column(db.Text)
    phone = db.Column(db.String(50))
    instagram = db.Column(db.String(50))
    email = db.Column(db.String(100))
    logo_img = db.Column(db.Text) # Base64 görsel verisi

# Kütüphane (Arşiv)
class LibraryItem(db.Model):
    id = db.Column(db.BigInteger, primary_key=True) # Date.now() değeri için BigInteger
    title = db.Column(db.String(150), nullable=False)
    type = db.Column(db.String(50), nullable=False) 
    description = db.Column(db.Text)
    img_data = db.Column(db.Text) 
    link = db.Column(db.String(500))

# Projeler
class Project(db.Model):
    id = db.Column(db.BigInteger, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    link = db.Column(db.String(500))
    description = db.Column(db.Text)
    techs_csv = db.Column(db.Text) # Örn: "React,NodeJS,SCSS"

# Okul Kayıtları
class School(db.Model):
    id = db.Column(db.BigInteger, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    period = db.Column(db.String(50)) 
    gpa = db.Column(db.String(10)) 
    description = db.Column(db.Text)
    img_data = db.Column(db.Text)