# Use Node.js 20 LTS as the base image
FROM node:20

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Bundle app source
COPY . .

# Expose port (Cloud Run expects 8080)
EXPOSE 8080

# Start the app
CMD ["npm", "start"]
