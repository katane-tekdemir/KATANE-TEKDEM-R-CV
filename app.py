# app.py

from flask import Flask, jsonify, request, render_template
from database import db, Profile, Auth, LibraryItem, Project, School
import os

# --- UYGULAMA YAPILANDIRMASI ---
# Flask'e static/ klasörünün ön yüz dosyaları olduğunu söylüyoruz.
app = Flask(__name__, static_folder='static', template_folder='static')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///katane_db.sqlite' # Veritabanı adı
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# JSON Serileştirme Fonksiyonu
def serialize_data(data_list):
    """DB nesnelerini JS/JSON dostu dict'lere çevirir."""
    result = []
    for item in data_list:
        data = item.__dict__.copy()
        data.pop('_sa_instance_state', None) 
        
        # JS'in beklediği isimleri düzenle
        if 'techs_csv' in data and data['techs_csv']:
             data['techs'] = data.pop('techs_csv').split(',')
        if 'img_data' in data:
            data['img'] = data.pop('img_data')
        if 'description' in data:
            data['desc'] = data.pop('description')
        
        result.append(data)
    return result

# Varsayılan Başlangıç Verileri (DB boşsa yüklenecek)
DEFAULT_DATA = {
    'auth': {'email': 'hackersoftware', 'pass': 'ka21tane'},
    'profile': {
        'name': 'KATANE TEKDEMIR',
        'subtitle': 'DEVELOPER & DESIGNER',
        'about': 'Merhaba, ben Katane. Dijital dünyada fikirleri koda, tasarımları gerçeğe dönüştürüyorum.',
        'phone': '+90 555 000 00 00', 'instagram': '@katane', 'email': 'contact@katane.com',
        'logo': 'https://cdn-icons-png.flaticon.com/512/3665/3665939.png'
    },
    'library': [
        {'id': 1, 'title': 'Mr. Robot', 'type': 'series', 'img': 'https://images.tmsimg.com/assets/p11674149_b_v13_ad.jpg', 'desc': 'Psikolojik gerilim ve siber güvenlik şaheseri.', 'link': '#'},
    ],
    'projects': [{'id': 101, 'title': 'CyberBlog Backend', 'techs': ['NodeJS', 'MongoDB'], 'link': '#', 'desc': 'Gerçek zamanlı blog sistemi API altyapısı.'}],
    'schools': [{'id': 201, 'name': 'İstanbul Teknik Üniversitesi', 'period': '2018 - 2022', 'gpa': '3.85/4.00', 'img': 'https://via.placeholder.com/600x400?text=ITU+Logo', 'desc': 'Bilgisayar Mühendisliği.'}]
}


def initialize_db_data(data):
    """DB'ye varsayılan verileri ekler."""
    if not Auth.query.first():
        db.session.add(Auth(email=data['auth']['email'], password=data['auth']['pass']))
    
    if not Profile.query.first():
        p = data['profile']
        db.session.add(Profile(name=p['name'], subtitle=p['subtitle'], about=p['about'], phone=p['phone'], instagram=p['instagram'], email=p['email'], logo_img=p['logo']))
    
    if not LibraryItem.query.first():
        for item in data['library']:
             db.session.add(LibraryItem(id=item['id'], title=item['title'], type=item['type'], description=item['desc'], img_data=item['img'], link=item['link']))
    
    if not Project.query.first():
        for item in data['projects']:
             db.session.add(Project(id=item['id'], title=item['title'], link=item['link'], description=item['desc'], techs_csv=','.join(item['techs'])))

    if not School.query.first():
        for item in data['schools']:
             db.session.add(School(id=item['id'], name=item['name'], period=item['period'], gpa=item['gpa'], description=item['desc'], img_data=item['img']))

    db.session.commit()
    print(">> Veritabanı başarıyla başlatıldı ve varsayılan veriler yüklendi.")


# --- ROTA VE API UÇ NOKTALARI ---

@app.route('/')
def serve_index():
    # Anasayfa isteğini static/index.html'e yönlendirir.
    return render_template('index.html')

@app.route('/api/data', methods=['GET'])
def get_all_data():
    """Ön yüzün ilk açılışta tüm veriyi çekmesi için endpoint."""
    profile = Profile.query.first()
    auth = Auth.query.first()
    
    full_data = {
        # Eğer profil/auth yoksa, boş objeler döndür
        'auth': {'email': auth.email, 'pass': auth.password} if auth else {},
        'profile': serialize_data([profile])[0] if profile else {},
        'library': serialize_data(LibraryItem.query.all()),
        'projects': serialize_data(Project.query.all()),
        'schools': serialize_data(School.query.all())
    }
    
    return jsonify(full_data)

@app.route('/api/data/save', methods=['POST'])
def save_all_data():
    """Ön yüzden gelen tüm güncel veriyi kaydeder."""
    data = request.json
    
    # Basit bir güvenlik kontrolü (İDEALDE TOKEN GEREKİR)
    admin_auth = Auth.query.first()
    if not data or data.get('auth_email') != admin_auth.email or data.get('auth_pass') != admin_auth.password:
        return jsonify({'message': 'Authorization Required'}), 401

    # Tüm tabloları temizle
    db.session.query(LibraryItem).delete()
    db.session.query(Project).delete()
    db.session.query(School).delete()
    db.session.commit()
    
    # Kütüphane Verilerini Kaydet
    for item in data.get('library', []):
        new_item = LibraryItem(
            id=item.get('id'), title=item.get('title'), type=item.get('type'), 
            description=item.get('desc'), img_data=item.get('img'), link=item.get('link')
        )
        db.session.add(new_item)
        
    # Proje Verilerini Kaydet
    for item in data.get('projects', []):
        new_proj = Project(
            id=item.get('id'), title=item.get('title'), link=item.get('link'),
            description=item.get('desc'), techs_csv=','.join(item.get('techs', []))
        )
        db.session.add(new_proj)

    # Okul Verilerini Kaydet
    for item in data.get('schools', []):
        new_school = School(
            id=item.get('id'), name=item.get('name'), period=item.get('period'),
            gpa=item.get('gpa'), description=item.get('desc'), img_data=item.get('img')
        )
        db.session.add(new_school)

    # Profil ve Auth güncellemeleri
    profile_data = data.get('profile', {})
    current_profile = Profile.query.first()
    if current_profile:
        current_profile.name = profile_data.get('name', current_profile.name)
        current_profile.subtitle = profile_data.get('subtitle', current_profile.subtitle)
        current_profile.about = profile_data.get('about', current_profile.about)
        current_profile.phone = profile_data.get('phone', current_profile.phone)
        current_profile.instagram = profile_data.get('instagram', current_profile.instagram)
        current_profile.email = profile_data.get('email', current_profile.email)
        current_profile.logo_img = profile_data.get('logo', current_profile.logo_img)
    
    db.session.commit()
    return jsonify({'message': 'Data saved successfully'}), 200

# Uygulamayı başlat
if __name__ == '__main__':
    with app.app_context():
        # Tabloları oluştur ve varsayılan veriyi yükle
        db.create_all()
        initialize_db_data(DEFAULT_DATA) 
    app.run(debug=True, port=os.environ.get('PORT', 5000))