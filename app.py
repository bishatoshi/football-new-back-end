
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import requests
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import tempfile
import re

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

API_KEY = '4dcc53e79e0048afbd594e2bba17f205'
SUPPORT_EMAIL = 'footballnews111234@gmail.com'

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/key')
def get_key():
    return jsonify({"apiKey": API_KEY})

def is_football_related(title, description):
    """
    Enhanced function to determine if an article is specifically about football/soccer
    """
    title_lower = (title or '').lower()
    desc_lower = (description or '').lower()
    
    # Combine title and description for analysis
    full_text = f"{title_lower} {desc_lower}"
    
    # Strong football indicators - must have at least one
    football_keywords = [
        'football', 'soccer', 'fifa', 'uefa', 'premier league', 'champions league',
        'world cup', 'la liga', 'serie a', 'bundesliga', 'ligue 1', 'europa league',
        'goal', 'goals', 'striker', 'midfielder', 'defender', 'goalkeeper',
        'match', 'fixture', 'kick-off', 'penalty', 'offside', 'corner',
        'transfer', 'signing', 'contract', 'club', 'team', 'squad',
        'manager', 'coach', 'tactics', 'formation', 'substitution',
        'messi', 'ronaldo', 'mbappe', 'haaland', 'neymar', 'benzema',
        'manchester united', 'manchester city', 'liverpool', 'chelsea', 'arsenal',
        'tottenham', 'barcelona', 'real madrid', 'bayern munich', 'psg',
        'juventus', 'ac milan', 'inter milan', 'atletico madrid', 'borussia',
        'napoli', 'roma', 'lazio', 'valencia', 'sevilla', 'villarreal',
        'euro 2024', 'copa america', 'nations league', 'qualifying',
        'ballon d\'or', 'golden boot', 'player of the year',
        'stadium', 'pitch', 'referee', 'var', 'yellow card', 'red card',
        'injury time', 'extra time', 'shootout', 'aggregate', 'away goals'
    ]
    
    # Exclude non-football sports strongly
    exclude_keywords = [
        'basketball', 'nba', 'baseball', 'mlb', 'nfl', 'american football',
        'tennis', 'golf', 'hockey', 'nhl', 'cricket', 'rugby', 'boxing',
        'mma', 'ufc', 'wrestling', 'wwe', 'swimming', 'athletics', 'track and field',
        'volleyball', 'badminton', 'table tennis', 'ping pong', 'cycling',
        'formula 1', 'f1', 'racing', 'nascar', 'motogp', 'rally',
        'skiing', 'snowboarding', 'ice skating', 'curling',
        'surfing', 'sailing', 'rowing', 'kayaking',
        'gymnastics', 'weightlifting', 'powerlifting', 'crossfit',
        'esports', 'gaming', 'league of legends', 'dota', 'cs:go',
        'horse racing', 'equestrian', 'polo',
        'dart', 'snooker', 'pool', 'billiards',
        'chess', 'poker', 'bridge',
        'marathon', 'triathlon', 'ironman',
        'climbing', 'mountaineering', 'hiking',
        'fishing', 'hunting', 'archery',
        'lacrosse', 'field hockey', 'water polo',
        'handball', 'netball', 'softball',
        'skateboarding', 'bmx', 'parkour',
        'martial arts', 'karate', 'judo', 'taekwondo',
        'fencing', 'shooting', 'biathlon'
    ]
    
    # Business/Finance terms that often appear in non-sports articles
    business_exclude = [
        'stock', 'market', 'trading', 'investment', 'finance', 'economy',
        'cryptocurrency', 'bitcoin', 'blockchain', 'forex', 'currency',
        'merger', 'acquisition', 'ipo', 'earnings', 'revenue', 'profit',
        'technology', 'software', 'app', 'digital', 'ai', 'artificial intelligence',
        'cybersecurity', 'data', 'cloud', 'startup', 'venture capital',
        'real estate', 'property', 'housing', 'mortgage',
        'politics', 'election', 'government', 'policy', 'law', 'legal',
        'health', 'medical', 'hospital', 'doctor', 'patient', 'treatment',
        'education', 'university', 'college', 'student', 'academic',
        'entertainment', 'movie', 'film', 'music', 'concert', 'album',
        'fashion', 'beauty', 'lifestyle', 'travel', 'tourism',
        'food', 'restaurant', 'cooking', 'recipe', 'chef'
    ]
    
    # Check for excluded content first
    for keyword in exclude_keywords + business_exclude:
        if keyword in full_text:
            return False
    
    # Check for football content
    football_score = 0
    for keyword in football_keywords:
        if keyword in full_text:
            football_score += 1
    
    # Additional checks for team names and player names
    team_patterns = [
        r'\b(fc|ac|sc|cf|united|city|real|atletico|borussia|inter|sporting)\b',
        r'\b(arsenal|chelsea|liverpool|tottenham|everton|leicester|wolves)\b',
        r'\b(barcelona|madrid|valencia|sevilla|bilbao|sociedad|betis)\b',
        r'\b(juventus|milan|napoli|roma|lazio|atalanta|fiorentina)\b',
        r'\b(bayern|dortmund|leipzig|leverkusen|frankfurt|stuttgart)\b',
        r'\b(psg|marseille|lyon|monaco|lille|rennes|nice)\b'
    ]
    
    for pattern in team_patterns:
        if re.search(pattern, full_text):
            football_score += 2
    
    # Player name patterns (common football names)
    player_patterns = [
        r'\b(messi|ronaldo|mbappe|haaland|neymar|benzema|lewandowski)\b',
        r'\b(salah|mane|firmino|van dijk|alisson|fabinho)\b',
        r'\b(de bruyne|mahrez|sterling|aguero|silva|fernandinho)\b',
        r'\b(kane|son|lloris|alderweireld|vertonghen)\b',
        r'\b(aubameyang|lacazette|ozil|xhaka|bellerin)\b'
    ]
    
    for pattern in player_patterns:
        if re.search(pattern, full_text):
            football_score += 3
    
    # League and competition patterns
    competition_patterns = [
        r'\b(premier league|champions league|europa league|world cup)\b',
        r'\b(la liga|serie a|bundesliga|ligue 1|eredivisie)\b',
        r'\b(copa del rey|fa cup|carabao cup|community shield)\b',
        r'\b(euro 2024|nations league|copa america|afcon)\b'
    ]
    
    for pattern in competition_patterns:
        if re.search(pattern, full_text):
            football_score += 3
    
    # Football-specific terms
    football_terms = [
        r'\b(goal|goals|scored|scorer|assist|assists)\b',
        r'\b(penalty|free kick|corner|offside|var)\b',
        r'\b(striker|midfielder|defender|goalkeeper|winger)\b',
        r'\b(manager|coach|tactics|formation|lineup)\b',
        r'\b(transfer|signing|contract|loan|release clause)\b'
    ]
    
    for pattern in football_terms:
        if re.search(pattern, full_text):
            football_score += 1
    
    # Require a minimum score to be considered football-related
    return football_score >= 3

@app.route('/api/news')
def get_news():
    try:
        page = request.args.get('page', 1)
        page_size = request.args.get('pageSize', 20)
        
        # More targeted football-specific queries
        football_queries = [
            "\"Premier League\" OR \"Champions League\" OR \"World Cup\" OR \"La Liga\" OR \"Serie A\" OR \"Bundesliga\"",
            "\"Manchester United\" OR \"Manchester City\" OR \"Liverpool\" OR \"Chelsea\" OR \"Arsenal\"",
            "\"Barcelona\" OR \"Real Madrid\" OR \"Bayern Munich\" OR \"PSG\" OR \"Juventus\"",
            "\"Messi\" OR \"Ronaldo\" OR \"Mbappe\" OR \"Haaland\" OR \"Neymar\"",
            "\"football transfer\" OR \"soccer news\" OR \"UEFA\" OR \"FIFA\"",
            "\"Europa League\" OR \"Nations League\" OR \"Copa America\" OR \"Euro 2024\"",
            "\"football match\" OR \"soccer game\" OR \"goal scored\" OR \"penalty kick\"",
            "\"football manager\" OR \"soccer coach\" OR \"football tactics\""
        ]
        
        all_articles = []
        
        # Try each query to get comprehensive football coverage
        for query in football_queries:
            try:
                url = f"https://newsapi.org/v2/everything?q={query}&language=en&sortBy=publishedAt&pageSize=15&page={page}&apiKey={API_KEY}"
                response = requests.get(url)
                
                if response.ok:
                    data = response.json()
                    if data.get('articles'):
                        # Apply strict football filtering
                        for article in data['articles']:
                            if is_football_related(article.get('title'), article.get('description')):
                                all_articles.append(article)
                        
            except Exception as e:
                print(f"Error with query '{query}': {e}")
                continue
        
        # Remove duplicates based on URL
        seen_urls = set()
        unique_articles = []
        for article in all_articles:
            if article.get('url') and article['url'] not in seen_urls:
                seen_urls.add(article['url'])
                unique_articles.append(article)
        
        # Sort by publication date (newest first)
        unique_articles.sort(key=lambda x: x.get('publishedAt', ''), reverse=True)
        
        # Limit to requested page size
        start_idx = 0
        end_idx = int(page_size)
        paginated_articles = unique_articles[start_idx:end_idx]
        
        # If still no good results, try a fallback with stricter filtering
        if len(paginated_articles) < 5:
            fallback_queries = [
                "football AND (goal OR match OR player OR team)",
                "soccer AND (league OR cup OR championship)",
                "\"football news\" AND (transfer OR signing OR contract)"
            ]
            
            for query in fallback_queries:
                try:
                    url = f"https://newsapi.org/v2/everything?q={query}&language=en&sortBy=publishedAt&pageSize=10&page={page}&apiKey={API_KEY}"
                    response = requests.get(url)
                    
                    if response.ok:
                        data = response.json()
                        if data.get('articles'):
                            for article in data['articles']:
                                if (article.get('url') and 
                                    article['url'] not in seen_urls and 
                                    is_football_related(article.get('title'), article.get('description'))):
                                    seen_urls.add(article['url'])
                                    paginated_articles.append(article)
                                    
                                    if len(paginated_articles) >= int(page_size):
                                        break
                            
                            if len(paginated_articles) >= int(page_size):
                                break
                                
                except Exception as e:
                    print(f"Error with fallback query '{query}': {e}")
                    continue
        
        return jsonify({
            'status': 'ok',
            'totalResults': len(unique_articles),
            'articles': paginated_articles[:int(page_size)]
        })
        
    except Exception as e:
        return jsonify({
            'error': 'servers are sleeping',
            'message': str(e)
        }), 500

@app.route('/api/support', methods=['POST'])
def handle_support():
    try:
        # Get form data
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        message = request.form.get('message', '').strip()
        
        # Validate required fields
        if not name or not email or not message:
            return jsonify({
                'error': 'Missing required fields',
                'message': 'Name, email, and message are required'
            }), 400
        
        # Basic email validation
        if '@' not in email or '.' not in email:
            return jsonify({
                'error': 'Invalid email',
                'message': 'Please provide a valid email address'
            }), 400
        
        # Create email content
        email_subject = f"Support Request from {name}"
        email_body = f"""
New support request received:

Name: {name}
Email: {email}
Message:
{message}

---
This message was sent from the Football News Hub support form.
        """
        
        # Create email message
        msg = MIMEMultipart()
        msg['From'] = email
        msg['To'] = SUPPORT_EMAIL
        msg['Subject'] = email_subject
        
        # Add body to email
        msg.attach(MIMEText(email_body, 'plain'))
        
        # Handle file attachment if present
        if 'file' in request.files:
            file = request.files['file']
            if file.filename:
                # Save file temporarily
                with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                    file.save(temp_file.name)
                    
                    # Attach file to email
                    with open(temp_file.name, "rb") as attachment:
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(attachment.read())
                    
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename= {file.filename}',
                    )
                    msg.attach(part)
                    
                    # Clean up temp file
                    os.unlink(temp_file.name)
        
        # For demonstration purposes, we'll just log the support request
        # In a real application, you would configure SMTP settings and send the email
        print(f"Support request received from {name} ({email}): {message}")
        
        # Since we can't actually send emails without SMTP configuration,
        # we'll simulate a successful response
        return jsonify({
            'status': 'success',
            'message': 'Support request received successfully'
        })
        
        # Uncomment and configure the following code to actually send emails:
        """
        # SMTP Configuration (you would need to set these up)
        smtp_server = "smtp.gmail.com"
        smtp_port = 587
        smtp_username = "your-email@gmail.com"
        smtp_password = "your-app-password"
        
        # Send email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        text = msg.as_string()
        server.sendmail(email, SUPPORT_EMAIL, text)
        server.quit()
        
        return jsonify({
            'status': 'success',
            'message': 'Support request sent successfully'
        })
        """
        
    except Exception as e:
        print(f"Error handling support request: {e}")
        return jsonify({
            'error': 'Failed to process support request',
            'message': str(e)
        }), 500

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)

