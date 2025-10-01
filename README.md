Host: postgres  (or try 172.19.0.3)
Database: kewalinvest
User: kewal_admin
Password: [check your .env file for DB_PASSWORD value]
Port: 5432
SSL: Disable/None











docker build -t vikuna/kewalinvest-backend:latest ./backend
docker push vikuna/kewalinvest-backend:latest


docker build -t vikuna/kewalinvest-frontend:latest ./frontend
docker push vikuna/kewalinvest-frontend:latest