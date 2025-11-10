# ==============================================================================
# 1. DEVELOPMENT STAGE (Hot Reloading အတွက်)
# ==============================================================================
FROM node:20-alpine AS development

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install
COPY . .

# ==============================================================================
# 2. BUILD STAGE (Dependency Install နှင့် Project Build လုပ်ရန်)
# ==============================================================================
FROM node:20-alpine AS build

# Working directory သတ်မှတ်ခြင်း
WORKDIR /app

# Package.json နဲ့ lock files တွေကို ကူးယူခြင်း
COPY package.json package-lock.json ./

# Dependencies များ Install လုပ်ခြင်း
RUN npm install

# Project Files အားလုံးကို ကူးယူခြင်း
COPY . .

# NestJS Project ကို Production အတွက် Build လုပ်ခြင်း
# (Output ကို dist/ folder ထဲ ထုတ်ပေးပါမယ်)
RUN npm run build


# ==============================================================================
# 3. PRODUCTION STAGE (App ကို Run ဖို့အတွက် အလွန်ပေါ့ပါးသော Image)
# ==============================================================================
FROM node:20-alpine AS production

# Working directory သတ်မှတ်ခြင်း
WORKDIR /app

# Dependencies ကို လျော့ချထားတဲ့ package.json နဲ့ Production dependencies တွေ ကူးယူခြင်း
COPY package.json ./
RUN npm install --production

# Build Stage က ထွက်လာတဲ့ dist/ folder ကို ကူးယူခြင်း
COPY --from=build /app/dist ./dist

# .env file ကို ကူးယူခြင်း (သို့သော် AWS မှာ Environment Variables သုံးတာ ပိုကောင်းပါတယ်)
# COPY .env ./.env

# Container Run တဲ့အခါ ဖွင့်မယ့် Port
EXPOSE 3000

# Application စတင် Run ဖို့ Command
# NestJS ရဲ့ main.js ကို Run ပါမယ်
CMD npm run start:prod