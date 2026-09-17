FROM node:22-alpine AS web-build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html postcss.config.js tailwind.config.js tsconfig.json tsconfig.node.json vite.config.ts ./
COPY public ./public
COPY src ./src
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS api-build
WORKDIR /src
COPY server/GarageHub.Api/GarageHub.Api.csproj server/GarageHub.Api/
RUN dotnet restore server/GarageHub.Api/GarageHub.Api.csproj
COPY server/GarageHub.Api server/GarageHub.Api
RUN dotnet publish server/GarageHub.Api/GarageHub.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS runtime
WORKDIR /app
COPY --from=api-build /app/publish ./
COPY --from=web-build /src/dist ./wwwroot
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "GarageHub.Api.dll"]
