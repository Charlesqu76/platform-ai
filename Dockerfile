# Step 1: Use the official Node.js image as the base image
FROM node:18

# Step 2: Set the working directory inside the container
WORKDIR /usr/src/app

# Step 3: Copy the package.json and package-lock.json to the working directory
COPY package*.json ./

# Step 4: Install dependencies
RUN npm install --production

# Step 5: Copy the rest of the application code to the container
COPY . .

# Step 6: Expose the port your app will run on
EXPOSE 3002

# Step 7: Define the command to run your app
CMD ["npm", "start"]
