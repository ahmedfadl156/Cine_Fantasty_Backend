const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5500}`;

const successEnvelope = (dataSchema, extra = {}) => ({
  type: "object",
  properties: {
    status: { type: "string", example: "success" },
    ...extra,
    data: dataSchema,
  },
});

const errorResponse = (statusCode, message, extra = {}) => ({
  description: message,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          status: { type: "string", example: "fail" },
          message: { type: "string", example: message },
          ...extra,
        },
      },
    },
  },
});

const securedOperation = {
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
};

const paginationParameters = [
  {
    in: "query",
    name: "page",
    schema: { type: "integer", minimum: 1, default: 1 },
    description: "Page number.",
  },
  {
    in: "query",
    name: "limit",
    schema: { type: "integer", minimum: 1, default: 20 },
    description: "Maximum number of items to return.",
  },
];

const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "CineFantasty API",
    version: "1.0.0",
    description:
      "Professional OpenAPI documentation for the CineFantasty backend. This spec covers authentication, user profile management, market actions, leagues, seasons, studio assets, movies, and dashboard endpoints.",
  },
  servers: [
    {
      url: serverUrl,
      description: "Current application server",
    },
  ],
  tags: [
    { name: "Auth", description: "Authentication and current-user session endpoints." },
    { name: "Users", description: "Authenticated user profile management endpoints." },
    { name: "Market", description: "Market browsing and movie purchasing endpoints." },
    { name: "Movies", description: "Movie browsing and admin movie operations." },
    { name: "Studio", description: "Studio portfolio and owned asset endpoints." },
    { name: "Leagues", description: "League creation, joining, and league analytics endpoints." },
    { name: "Seasons", description: "Season administration endpoints." },
    { name: "Dashboard", description: "Command center and maintenance endpoints." },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "cineFantasty_Jwt",
      },
    },
    schemas: {
      MongoId: {
        type: "string",
        example: "6801f4b784be1bb98f425d9d",
      },
      User: {
        type: "object",
        properties: {
          _id: { $ref: "#/components/schemas/MongoId" },
          studioName: { type: "string", example: "Sunset Pictures" },
          email: { type: "string", format: "email", example: "owner@sunsetpictures.com" },
          avatar: { type: "string", example: "/user_logo.jpg" },
          role: { type: "string", enum: ["user", "admin"], example: "user" },
          passwordChangedAt: { type: "string", format: "date-time", nullable: true },
          lastLogin: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Season: {
        type: "object",
        properties: {
          _id: { $ref: "#/components/schemas/MongoId" },
          name: { type: "string", example: "Summer 2026" },
          startDate: { type: "string", format: "date-time" },
          endDate: { type: "string", format: "date-time" },
          status: {
            type: "string",
            enum: ["PRE_SEASON", "ACTIVE", "POST_SEASON", "CLOSED"],
            example: "PRE_SEASON",
          },
          startingBudget: { type: "number", example: 40000000000 },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      StudioSeason: {
        type: "object",
        properties: {
          _id: { $ref: "#/components/schemas/MongoId" },
          userId: { $ref: "#/components/schemas/MongoId" },
          seasonId: { $ref: "#/components/schemas/MongoId" },
          cashBalance: { type: "number", example: 39850000000 },
          netWorth: { type: "number", example: 40125000000 },
          cashBalanceInDollars: { type: "number", example: 398500000 },
          netWorthInDollars: { type: "number", example: 401250000 },
          finalRank: { type: "integer", nullable: true, example: 2 },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      MovieSummary: {
        type: "object",
        properties: {
          _id: { $ref: "#/components/schemas/MongoId" },
          title: { type: "string", example: "The Last Kingdom" },
          posterPath: { type: "string", nullable: true, example: "https://image.tmdb.org/t/p/w500/poster.jpg" },
          backdropPath: { type: "string", nullable: true, example: "https://image.tmdb.org/t/p/original/backdrop.jpg" },
          releaseDate: { type: "string", format: "date-time" },
          basePrice: { type: "number", example: 249900000 },
          basePriceInDollars: { type: "number", example: 2499000 },
        },
      },
      MovieAdmin: {
        type: "object",
        properties: {
          _id: { $ref: "#/components/schemas/MongoId" },
          tmdbId: { type: "integer", example: 123456 },
          seasonId: {
            oneOf: [
              { $ref: "#/components/schemas/MongoId" },
              {
                type: "object",
                properties: {
                  _id: { $ref: "#/components/schemas/MongoId" },
                  name: { type: "string", example: "Summer 2026" },
                  status: { type: "string", example: "ACTIVE" },
                },
              },
            ],
          },
          title: { type: "string", example: "The Last Kingdom" },
          posterPath: { type: "string", nullable: true },
          backdropPath: { type: "string", nullable: true },
          genres: { type: "array", items: { type: "string" }, example: ["Action", "Drama"] },
          releaseDate: { type: "string", format: "date-time" },
          status: { type: "string", enum: ["UPCOMING", "IN_THEATERS", "FINISHED"] },
          basePrice: { type: "number", example: 249900000 },
          basePriceInDollars: { type: "number", example: 2499000 },
          boxOfficeRevenue: { type: "number", example: 520000000 },
          boxOfficeRevenueInDollars: { type: "number", example: 5200000 },
          popularity: { type: "number", example: 91.4 },
          currentProfitOrLoss: { type: "number", example: 2701000 },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      StudioAsset: {
        type: "object",
        properties: {
          _id: { $ref: "#/components/schemas/MongoId" },
          userId: { $ref: "#/components/schemas/MongoId" },
          movieId: { $ref: "#/components/schemas/MongoId" },
          seasonId: { $ref: "#/components/schemas/MongoId" },
          purchasePrice: { type: "number", example: 249900000 },
          purchasePriceInDollars: { type: "number", example: 2499000 },
          status: { type: "string", enum: ["ACTIVE", "SOLD", "ARCHIVED"], example: "ACTIVE" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      LeagueSummary: {
        type: "object",
        properties: {
          _id: { $ref: "#/components/schemas/MongoId" },
          name: { type: "string", example: "Weekend Box Office Kings" },
          inviteCode: { type: "string", example: "AF-8K4R2Q" },
          ownerId: { $ref: "#/components/schemas/MongoId" },
          isPublic: { type: "boolean", example: true },
          memberCount: { type: "integer", example: 12 },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          currentPage: { type: "integer", example: 1 },
          totalPages: { type: "integer", example: 5 },
          totalMovies: { type: "integer", example: 92 },
          totalAvailableLeagues: { type: "integer", example: 18 },
          hasNextPage: { type: "boolean", example: true },
          hasPreviousPage: { type: "boolean", example: false },
          limit: { type: "integer", example: 20 },
        },
      },
      Error: {
        type: "object",
        properties: {
          status: { type: "string", example: "fail" },
          message: { type: "string", example: "Something went wrong" },
        },
      },
    },
    responses: {
      Unauthorized: errorResponse(401, "You are not logged in! Please log in to get access."),
      Forbidden: errorResponse(403, "You do not have permission to perform this action"),
      NotFound: errorResponse(404, "Resource not found"),
      ValidationError: errorResponse(400, "Validation failed"),
    },
  },
  paths: {
    "/api/v1/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in a user",
        description: "Authenticates a user and sets the `cineFantasty_Jwt` cookie. A bearer token may also be supplied on future requests.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "owner@sunsetpictures.com" },
                  password: { type: "string", format: "password", example: "SecurePass123" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "User logged in successfully.",
            content: {
              "application/json": {
                schema: successEnvelope({
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/User" },
                  },
                }),
              },
            },
          },
          401: errorResponse(401, "Incorrect email or password"),
          429: errorResponse(429, "Too many login attempts from this IP , please try again after 15 minutes"),
        },
      },
    },
    "/api/v1/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Log out the current user",
        description: "Clears the authentication cookie.",
        responses: {
          200: {
            description: "User logged out successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/auth/signup": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        description: "Creates a new studio account, initializes studio season data if an active or pre-season exists, and sets the authentication cookie.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["studioName", "email", "password"],
                properties: {
                  studioName: { type: "string", minLength: 3, maxLength: 50, example: "Sunset Pictures" },
                  email: { type: "string", format: "email", example: "owner@sunsetpictures.com" },
                  password: { type: "string", format: "password", minLength: 8, example: "SecurePass123" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "User registered successfully.",
            content: {
              "application/json": {
                schema: successEnvelope({
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/User" },
                  },
                }),
              },
            },
          },
          400: errorResponse(400, "Validation failed"),
          429: errorResponse(429, "Too many login attempts from this IP , please try again after 15 minutes"),
        },
      },
    },
    "/api/v1/auth/getMe": {
      get: {
        ...securedOperation,
        tags: ["Auth"],
        summary: "Get the current authenticated user",
        description: "Returns the current user plus active season context and initialized studio season data when available.",
        responses: {
          200: {
            description: "Current user returned successfully.",
            content: {
              "application/json": {
                schema: successEnvelope({
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/User" },
                    activeSeason: {
                      nullable: true,
                      oneOf: [
                        {
                          type: "object",
                          properties: {
                            seasonId: { $ref: "#/components/schemas/MongoId" },
                            seasonName: { type: "string", example: "Summer 2026" },
                            startDate: { type: "string", format: "date-time" },
                            endDate: { type: "string", format: "date-time" },
                            status: { type: "string", example: "ACTIVE" },
                            currentStudio: { $ref: "#/components/schemas/StudioSeason" },
                          },
                        },
                      ],
                    },
                  },
                }),
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          404: errorResponse(404, "User not found"),
        },
      },
    },
    "/api/v1/auth/test-sync": {
      post: {
        tags: ["Auth"],
        summary: "Run a movie sync test",
        description: "Triggers the movie sync routine and returns a sample of calculated prices. This route is currently public in the codebase.",
        responses: {
          200: {
            description: "Sync completed successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    message: { type: "string", example: "Sync successful! Data saved to MongoDB." },
                    result: { type: "integer", example: 10 },
                    sample_prices: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string", example: "The Last Kingdom" },
                          popularity: { type: "number", example: 89.2 },
                          calculated_price_dollars: { type: "number", example: 2450000 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/user/updateMe": {
      patch: {
        ...securedOperation,
        tags: ["Users"],
        summary: "Update the current user's profile",
        description: "Updates `studioName` and/or `email` for the authenticated user. Password changes are not allowed on this route.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  studioName: { type: "string", example: "Sunset Pictures International" },
                  email: { type: "string", format: "email", example: "new-owner@sunsetpictures.com" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "User updated successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    message: { type: "string", example: "User updated successfully" },
                    data: {
                      type: "object",
                      properties: {
                        user: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: errorResponse(400, "This route is not for password updates. Please use /updateMyPassword"),
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/v1/user/updateMyPassword": {
      patch: {
        ...securedOperation,
        tags: ["Users"],
        summary: "Update the current user's password",
        description: "Validates the current password, saves the new password, and issues a fresh authentication cookie.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentPassword", "newPassword"],
                properties: {
                  currentPassword: { type: "string", format: "password", example: "SecurePass123" },
                  newPassword: { type: "string", format: "password", minLength: 8, example: "EvenMoreSecure456" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Password updated successfully.",
            content: {
              "application/json": {
                schema: successEnvelope({
                  type: "object",
                  properties: {
                    user: { $ref: "#/components/schemas/User" },
                  },
                }),
              },
            },
          },
          401: errorResponse(401, "The current password you entered is incorrect."),
        },
      },
    },
    "/api/v1/market": {
      get: {
        tags: ["Market"],
        summary: "List upcoming market movies",
        description: "Returns paginated upcoming movies for the current active or pre-season market.",
        parameters: paginationParameters,
        responses: {
          200: {
            description: "Upcoming movies returned successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    results: { type: "integer", example: 20 },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                    data: {
                      type: "object",
                      properties: {
                        movies: {
                          type: "array",
                          items: { $ref: "#/components/schemas/MovieSummary" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/market/get-top-movies": {
      get: {
        tags: ["Market"],
        summary: "Get top movies for the home market view",
        description: "Returns up to 8 popular upcoming movies for the current season.",
        responses: {
          200: {
            description: "Top movies returned successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    results: { type: "integer", example: 8 },
                    data: {
                      type: "object",
                      properties: {
                        movies: {
                          type: "array",
                          items: { $ref: "#/components/schemas/MovieSummary" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/market/buy-movie/{movieId}": {
      post: {
        ...securedOperation,
        tags: ["Market"],
        summary: "Purchase a movie",
        description: "Buys an upcoming movie for the authenticated user's studio if the movie is still available and the studio has enough balance.",
        parameters: [
          {
            in: "path",
            name: "movieId",
            required: true,
            schema: { $ref: "#/components/schemas/MongoId" },
            description: "Movie identifier.",
          },
        ],
        responses: {
          201: {
            description: "Movie purchased successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    message: { type: "string", example: "Movie successfully added to your studio!" },
                    data: {
                      type: "object",
                      properties: {
                        asset: { $ref: "#/components/schemas/StudioAsset" },
                        remainingBalance: { type: "number", nullable: true, example: 39500100000 },
                      },
                    },
                  },
                },
              },
            },
          },
          400: errorResponse(400, "This movie is no longer available for purchase."),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: errorResponse(404, "No movie found with that ID"),
        },
      },
    },
    "/api/v1/movie/get-movie-details/{id}": {
      get: {
        tags: ["Movies"],
        summary: "Get detailed movie information",
        description: "Returns the in-game movie record plus enriched TMDB details such as cast, director, budget, and runtime.",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { $ref: "#/components/schemas/MongoId" },
            description: "Movie identifier.",
          },
        ],
        responses: {
          200: {
            description: "Movie details returned successfully.",
            content: {
              "application/json": {
                schema: successEnvelope({
                  type: "object",
                  properties: {
                    draftInfo: {
                      type: "object",
                      properties: {
                        systemId: { $ref: "#/components/schemas/MongoId" },
                        title: { type: "string", example: "The Last Kingdom" },
                        gameStatus: { type: "string", example: "UPCOMING" },
                        posterPath: { type: "string", nullable: true },
                        purchasePriceInDollars: { type: "number", example: 2499000 },
                        currentProfitOrLoss: { type: "number", example: 50000 },
                      },
                    },
                    movieDetails: {
                      type: "object",
                      properties: {
                        tagline: { type: "string", example: "A legend rises." },
                        overview: { type: "string" },
                        budgetInDollars: { type: "number", example: 150000000 },
                        realLifeRevenue: { type: "number", example: 320000000 },
                        runtime: { type: "number", example: 128 },
                        releaseDate: { type: "string", example: "2026-07-10" },
                        productionCompanies: { type: "array", items: { type: "string" } },
                        director: { type: "string", example: "Jane Doe" },
                        topCast: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string", example: "Actor Name" },
                              character: { type: "string", example: "Hero" },
                              profilePic: { type: "string", nullable: true },
                            },
                          },
                        },
                      },
                    },
                  },
                }),
              },
            },
          },
          404: errorResponse(404, "Movie not found"),
        },
      },
    },
    "/api/v1/movie/get-all-movies": {
      get: {
        ...securedOperation,
        tags: ["Movies"],
        summary: "Get all movies for admin management",
        description: "Admin-only listing endpoint with pagination, season filter, status filter, and title search.",
        parameters: [
          ...paginationParameters,
          {
            in: "query",
            name: "seasonId",
            schema: { $ref: "#/components/schemas/MongoId" },
            description: "Filter by season id.",
          },
          {
            in: "query",
            name: "status",
            schema: { type: "string", enum: ["UPCOMING", "IN_THEATERS", "FINISHED"] },
            description: "Filter by movie status.",
          },
          {
            in: "query",
            name: "search",
            schema: { type: "string", example: "kingdom" },
            description: "Case-insensitive title search.",
          },
        ],
        responses: {
          200: {
            description: "Admin movies returned successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    results: { type: "integer", example: 20 },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                    data: {
                      type: "object",
                      properties: {
                        movies: {
                          type: "array",
                          items: { $ref: "#/components/schemas/MovieAdmin" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/v1/movie/update-movie/{id}": {
      patch: {
        ...securedOperation,
        tags: ["Movies"],
        summary: "Update a movie manually as admin",
        description: "Admin-only endpoint for changing movie status, release date, and pricing fields. Clears related market cache after saving.",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { $ref: "#/components/schemas/MongoId" },
            description: "Movie identifier.",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", enum: ["UPCOMING", "IN_THEATERS", "FINISHED"] },
                  basePriceInDollars: { type: "number", example: 2499000 },
                  boxOfficePriceInDollars: { type: "number", example: 4000000 },
                  releaseDate: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Movie updated successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    message: { type: "string", example: "Movie The Last Kingdom has been manually updated." },
                    data: {
                      type: "object",
                      properties: {
                        movie: { $ref: "#/components/schemas/MovieAdmin" },
                      },
                    },
                  },
                },
              },
            },
          },
          404: errorResponse(404, "No movie found with that ID"),
        },
      },
    },
    "/api/v1/movie/sync-movies": {
      post: {
        ...securedOperation,
        tags: ["Movies"],
        summary: "Force sync upcoming movies from TMDB",
        description: "Admin-only endpoint that manually runs the TMDB sync job.",
        responses: {
          200: {
            description: "Movie sync executed successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    message: { type: "string", example: "Manual TMDB sync completed successfully. The market is now up to date!" },
                    results: { type: "integer", example: 14 },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/movie/test-sync": {
      post: {
        ...securedOperation,
        tags: ["Movies"],
        summary: "Run admin movie sync test",
        description: "Admin-only variant of the sync test endpoint.",
        responses: {
          200: {
            description: "Sync test completed successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    message: { type: "string", example: "Sync successful! Data saved to MongoDB." },
                    result: { type: "integer", example: 10 },
                    sample_prices: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          popularity: { type: "number" },
                          calculated_price_dollars: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/studio/my-studio": {
      get: {
        ...securedOperation,
        tags: ["Studio"],
        summary: "Get the authenticated user's studio dashboard",
        description: "Returns studio overview plus categorized movie assets for the selected or current season.",
        parameters: [
          {
            in: "query",
            name: "seasonId",
            schema: { $ref: "#/components/schemas/MongoId" },
            description: "Optional season identifier. If omitted, the current active or pre-season is used.",
          },
        ],
        responses: {
          200: {
            description: "Studio dashboard returned successfully.",
            content: {
              "application/json": {
                schema: successEnvelope({
                  type: "object",
                  properties: {
                    overview: {
                      nullable: true,
                      oneOf: [
                        {
                          type: "object",
                          properties: {
                            seasonId: { $ref: "#/components/schemas/MongoId" },
                            totalInvestedInDollars: { type: "number", example: 7350000 },
                            totalFilmsOwned: { type: "integer", example: 6 },
                          },
                        },
                      ],
                    },
                    dashboard: {
                      nullable: true,
                      oneOf: [
                        {
                          type: "object",
                          properties: {
                            inTheaters: { type: "array", items: { type: "object" } },
                            inProduction: { type: "array", items: { type: "object" } },
                            archivedFilms: { type: "array", items: { type: "object" } },
                          },
                        },
                      ],
                    },
                  },
                }, {
                  message: { type: "string", nullable: true, example: "No active season running." },
                }),
              },
            },
          },
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/v1/leagues/create": {
      post: {
        ...securedOperation,
        tags: ["Leagues"],
        summary: "Create a league",
        description: "Creates a new league for the current season. Users can own at most 3 leagues per season.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", minLength: 3, maxLength: 30, example: "Weekend Box Office Kings" },
                  isPublic: { type: "boolean", example: true },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "League created successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    message: { type: "string", example: "League created successfully! Invite your friends using the code." },
                    data: {
                      type: "object",
                      properties: {
                        league: { $ref: "#/components/schemas/LeagueSummary" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: errorResponse(400, "Please provide a name for the league"),
          403: errorResponse(403, "You have reached the maximum limit. You can only own up to 3 leagues"),
          404: errorResponse(404, "There is no active season at the moment. Please wait for the next season to start."),
        },
      },
    },
    "/api/v1/leagues/join": {
      post: {
        ...securedOperation,
        tags: ["Leagues"],
        summary: "Join a private league by invite code",
        description: "Adds the authenticated user to a private league using its invite code.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["inviteCode"],
                properties: {
                  inviteCode: { type: "string", example: "AF-8K4R2Q" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "League joined successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    message: { type: "string", example: "Successfully joined league Weekend Box Office Kings" },
                    data: {
                      type: "object",
                      properties: {
                        league: {
                          type: "object",
                          properties: {
                            _id: { $ref: "#/components/schemas/MongoId" },
                            name: { type: "string", example: "Weekend Box Office Kings" },
                            memberCount: { type: "integer", example: 15 },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: errorResponse(400, "Please provide an invite code"),
          404: errorResponse(404, "Invalid invite code. Please check and try again"),
        },
      },
    },
    "/api/v1/leagues/join-public/{leagueId}": {
      post: {
        ...securedOperation,
        tags: ["Leagues"],
        summary: "Join a public league",
        description: "Joins a public league directly by league id.",
        parameters: [
          {
            in: "path",
            name: "leagueId",
            required: true,
            schema: { $ref: "#/components/schemas/MongoId" },
            description: "League identifier.",
          },
        ],
        responses: {
          200: {
            description: "Public league joined successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    message: { type: "string", example: "Successfully joined Weekend Box Office Kings!" },
                    data: {
                      type: "object",
                      properties: {
                        league: {
                          type: "object",
                          properties: {
                            _id: { $ref: "#/components/schemas/MongoId" },
                            name: { type: "string", example: "Weekend Box Office Kings" },
                            memberCount: { type: "integer", example: 21 },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: errorResponse(400, "Invalid league id."),
          403: errorResponse(403, "This league is private. You need an invite code to join."),
          404: errorResponse(404, "League not found."),
          409: errorResponse(409, "Could not join the league at this time. It may have just reached full capacity."),
        },
      },
    },
    "/api/v1/leagues/get-public-leagues": {
      get: {
        ...securedOperation,
        tags: ["Leagues"],
        summary: "List available public leagues",
        description: "Returns paginated public leagues for the current season that the authenticated user has not already joined.",
        parameters: [
          {
            in: "query",
            name: "page",
            schema: { type: "integer", minimum: 1, default: 1 },
            description: "Page number.",
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", minimum: 1, default: 12 },
            description: "Maximum number of leagues to return.",
          },
        ],
        responses: {
          200: {
            description: "Public leagues returned successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    results: { type: "integer", example: 12 },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                    data: {
                      type: "object",
                      properties: {
                        leagues: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              _id: { $ref: "#/components/schemas/MongoId" },
                              name: { type: "string", example: "Weekend Box Office Kings" },
                              ownerName: { type: "array", items: { type: "string" }, example: ["Sunset Pictures"] },
                              membersCount: { type: "integer", example: 22 },
                              createdAt: { type: "string", format: "date-time" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/leagues/my-leagues": {
      get: {
        ...securedOperation,
        tags: ["Leagues"],
        summary: "Get the current user's leagues",
        description: "Returns all leagues the authenticated user belongs to in the current season.",
        responses: {
          200: {
            description: "User leagues returned successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    results: { type: "integer", example: 4 },
                    data: {
                      type: "object",
                      properties: {
                        leagues: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              _id: { $ref: "#/components/schemas/MongoId" },
                              name: { type: "string", example: "Weekend Box Office Kings" },
                              inviteCode: { type: "string", example: "AF-8K4R2Q" },
                              isPublic: { type: "boolean", example: true },
                              memberCount: { type: "integer", example: 22 },
                              ownerName: { type: "string", example: "Sunset Pictures" },
                              role: { type: "string", enum: ["OWNER", "MEMBER"], example: "OWNER" },
                              createdAt: { type: "string", format: "date-time" },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/leagues/get-league-details/{leagueId}": {
      get: {
        ...securedOperation,
        tags: ["Leagues"],
        summary: "Get league details",
        description: "Returns summary metadata for a league the authenticated user belongs to.",
        parameters: [
          {
            in: "path",
            name: "leagueId",
            required: true,
            schema: { $ref: "#/components/schemas/MongoId" },
            description: "League identifier.",
          },
        ],
        responses: {
          200: {
            description: "League details returned successfully.",
            content: {
              "application/json": {
                schema: successEnvelope({
                  type: "object",
                  properties: {
                    league: {
                      type: "object",
                      properties: {
                        _id: { $ref: "#/components/schemas/MongoId" },
                        name: { type: "string", example: "Weekend Box Office Kings" },
                        inviteCode: { type: "string", example: "AF-8K4R2Q" },
                        isPublic: { type: "boolean", example: true },
                        memberCount: { type: "integer", example: 22 },
                        ownerName: { type: "string", example: "Sunset Pictures" },
                        seasonInfo: {
                          type: "object",
                          properties: {
                            id: { $ref: "#/components/schemas/MongoId" },
                            name: { type: "string", example: "Summer 2026" },
                            status: { type: "string", example: "ACTIVE" },
                          },
                        },
                        role: { type: "string", enum: ["OWNER", "MEMBER"], example: "MEMBER" },
                        createdAt: { type: "string", format: "date-time" },
                      },
                    },
                  },
                }),
              },
            },
          },
          400: errorResponse(400, "Invalid league Id"),
          404: errorResponse(404, "League not found or you do not have permission to view it."),
        },
      },
    },
    "/api/v1/leagues/get-league-leaderboard/{leagueId}": {
      get: {
        ...securedOperation,
        tags: ["Leagues"],
        summary: "Get a league leaderboard",
        description: "Returns ranking data for all members of the specified league, plus the current user's own rank snapshot.",
        parameters: [
          {
            in: "path",
            name: "leagueId",
            required: true,
            schema: { $ref: "#/components/schemas/MongoId" },
            description: "League identifier.",
          },
        ],
        responses: {
          200: {
            description: "League leaderboard returned successfully.",
            content: {
              "application/json": {
                schema: successEnvelope({
                  type: "object",
                  properties: {
                    leagueDetails: {
                      type: "object",
                      properties: {
                        id: { $ref: "#/components/schemas/MongoId" },
                        name: { type: "string", example: "Weekend Box Office Kings" },
                        totalMembers: { type: "integer", example: 22 },
                      },
                    },
                    myStats: {
                      nullable: true,
                      oneOf: [
                        {
                          type: "object",
                          properties: {
                            userId: { $ref: "#/components/schemas/MongoId" },
                            rank: { type: "integer", example: 3 },
                            studioName: { type: "string", example: "Sunset Pictures" },
                            netWorthInDollars: { type: "number", example: 9850000 },
                            cashBalanceInDollars: { type: "number", example: 3200000 },
                            isMe: { type: "boolean", example: true },
                          },
                        },
                      ],
                    },
                    leaderboard: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          userId: { $ref: "#/components/schemas/MongoId" },
                          rank: { type: "integer", example: 1 },
                          studioName: { type: "string", example: "Empire Studios" },
                          netWorthInDollars: { type: "number", example: 12800000 },
                          cashBalanceInDollars: { type: "number", example: 2500000 },
                          isMe: { type: "boolean", example: false },
                        },
                      },
                    },
                  },
                }),
              },
            },
          },
          400: errorResponse(400, "Invalid league id"),
          403: errorResponse(403, "Access denied. You are not a member of this league."),
          404: errorResponse(404, "League not found"),
        },
      },
    },
    "/api/v1/leagues/get-league-activity-feed/{leagueId}": {
      get: {
        ...securedOperation,
        tags: ["Leagues"],
        summary: "Get a league activity feed",
        description: "Returns paginated activity log entries for league members.",
        parameters: [
          {
            in: "path",
            name: "leagueId",
            required: true,
            schema: { $ref: "#/components/schemas/MongoId" },
            description: "League identifier.",
          },
          ...paginationParameters,
        ],
        responses: {
          200: {
            description: "League activity feed returned successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    results: { type: "integer", example: 20 },
                    pagination: {
                      type: "object",
                      properties: {
                        currentPage: { type: "integer", example: 1 },
                        limit: { type: "integer", example: 20 },
                      },
                    },
                    data: {
                      type: "object",
                      properties: {
                        feed: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              id: { $ref: "#/components/schemas/MongoId" },
                              type: { type: "string", example: "MOVIE_PURCHASED" },
                              timestamp: { type: "string", format: "date-time" },
                              details: {
                                type: "object",
                                additionalProperties: true,
                                example: {
                                  movieTitle: "The Last Kingdom",
                                  studioName: "Sunset Pictures",
                                  purchasePriceInDollars: 2499000,
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          403: errorResponse(403, "Access denied. You are not a member of this league."),
          404: errorResponse(404, "League Not Found"),
        },
      },
    },
    "/api/v1/seasons/create": {
      post: {
        ...securedOperation,
        tags: ["Seasons"],
        summary: "Create a new season",
        description: "Admin-only endpoint that creates a new season in `PRE_SEASON` state.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "startDate", "endDate"],
                properties: {
                  name: { type: "string", example: "Summer 2026" },
                  startDate: { type: "string", format: "date-time" },
                  endDate: { type: "string", format: "date-time" },
                  startingBudget: { type: "number", example: 40000000000 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Season created successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    message: { type: "string", example: "Season created successfully. It is now in PRE_SEASON state." },
                    data: {
                      type: "object",
                      properties: {
                        season: { $ref: "#/components/schemas/Season" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: errorResponse(400, "Name, start date and end date are required"),
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/v1/seasons/updateStatus/{id}": {
      patch: {
        ...securedOperation,
        tags: ["Seasons"],
        summary: "Update a season's status",
        description: "Admin-only endpoint to move a season through its lifecycle. Closing a season also calculates final ranks.",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { $ref: "#/components/schemas/MongoId" },
            description: "Season identifier.",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    enum: ["PRE_SEASON", "ACTIVE", "POST_SEASON", "CLOSED"],
                    example: "ACTIVE",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Season status updated successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    message: { type: "string", example: "Season status updated to ACTIVE." },
                    data: {
                      type: "object",
                      properties: {
                        season: { $ref: "#/components/schemas/Season" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: errorResponse(400, "Invalid status provided"),
          404: errorResponse(404, "Season not found"),
        },
      },
    },
    "/api/v1/seasons/updateDetails/{id}": {
      patch: {
        ...securedOperation,
        tags: ["Seasons"],
        summary: "Update season metadata",
        description: "Admin-only endpoint that updates season name, dates, and optionally starting budget before the season is active.",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { $ref: "#/components/schemas/MongoId" },
            description: "Season identifier.",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", example: "Summer 2026 - Extended" },
                  startDate: { type: "string", format: "date-time" },
                  endDate: { type: "string", format: "date-time" },
                  startingBudget: { type: "number", example: 45000000000 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Season details updated successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "Success" },
                    message: { type: "string", example: "Season details updated successfully" },
                    data: {
                      type: "object",
                      properties: {
                        season: { $ref: "#/components/schemas/Season" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: errorResponse(400, "Cannot update starting budget after the season has started."),
          404: errorResponse(404, "Season not found"),
        },
      },
    },
    "/api/v1/seasons/getSeasonStats/{id}": {
      get: {
        ...securedOperation,
        tags: ["Seasons"],
        summary: "Get season analytics",
        description: "Admin-only endpoint that returns a season record and key economic analytics.",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { $ref: "#/components/schemas/MongoId" },
            description: "Season identifier.",
          },
        ],
        responses: {
          200: {
            description: "Season analytics returned successfully.",
            content: {
              "application/json": {
                schema: successEnvelope({
                  type: "object",
                  properties: {
                    season: { $ref: "#/components/schemas/Season" },
                    analytics: {
                      type: "object",
                      properties: {
                        totalPlayers: { type: "integer", example: 48 },
                        totalMovies: { type: "integer", example: 92 },
                        economy: {
                          type: "object",
                          properties: {
                            totalNetWorthInDollars: { type: "number", example: 812500000 },
                            totalAvailableCashInDollars: { type: "number", example: 250000000 },
                          },
                        },
                      },
                    },
                  },
                }),
              },
            },
          },
          400: errorResponse(400, "Invalid Season Id"),
          404: errorResponse(404, "Season not found"),
        },
      },
    },
    "/api/v1/dashboard/get-dashboard-data": {
      get: {
        tags: ["Dashboard"],
        summary: "Get command center statistics",
        description: "Returns high-level platform metrics, season overview, chart data, and system alerts. This route is currently public in the codebase.",
        responses: {
          200: {
            description: "Dashboard data returned successfully.",
            content: {
              "application/json": {
                schema: successEnvelope({
                  type: "object",
                  properties: {
                    overview: {
                      type: "object",
                      properties: {
                        totalUsers: { type: "integer", example: 350 },
                        activeSeasonStats: {
                          nullable: true,
                          oneOf: [
                            {
                              type: "object",
                              properties: {
                                seasonName: { type: "string", example: "Summer 2026" },
                                status: { type: "string", example: "ACTIVE" },
                                participatingPlayers: { type: "integer", example: 128 },
                                econmy: {
                                  type: "object",
                                  properties: {
                                    totalCashBalance: { type: "number", example: 120000000 },
                                    totalNetWorth: { type: "number", example: 480000000 },
                                  },
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                    charts: {
                      type: "object",
                      properties: {
                        newUsersLast7Days: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              _id: { type: "string", example: "2026-04-18" },
                              count: { type: "integer", example: 6 },
                            },
                          },
                        },
                      },
                    },
                    alerts: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: { type: "string", example: "warning" },
                          message: { type: "string" },
                        },
                      },
                    },
                  },
                }),
              },
            },
          },
        },
      },
    },
    "/api/v1/dashboard/sanitize-data": {
      post: {
        tags: ["Dashboard"],
        summary: "Clean invalid market movie data",
        description: "Scans for outdated upcoming movies, deletes those not owned, moves owned ones to `IN_THEATERS`, and clears cache keys. This route is currently public in the codebase.",
        responses: {
          200: {
            description: "Market database sanitized successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "success" },
                    message: { type: "string", example: "Database cleanup completed safely." },
                    details: {
                      type: "object",
                      properties: {
                        totalBuggyMoviesFound: { type: "integer", example: 5 },
                        deletedMovies: { type: "integer", example: 3 },
                        protectedAndMovedToTheaters: { type: "integer", example: 2 },
                      },
                    },
                  },
                },
              },
            },
          },
          500: errorResponse(500, "Failed to sanitize database."),
        },
      },
    },
  },
};

export default swaggerSpec;
