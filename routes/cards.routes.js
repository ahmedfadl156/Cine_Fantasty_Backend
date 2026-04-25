import { Router } from "express";
import { protect, restrictTo } from "../controllers/auth.controller.js";
import { applyCardToMovie, createCard, getAllCards, getAllCardsForAdmin, toggleCardStatus, updateCard } from "../controllers/cards.controller.js";

const cardsRouter = Router();

cardsRouter.use(protect);

cardsRouter.route("/").get(getAllCards).post(applyCardToMovie);

cardsRouter.use(restrictTo("admin"));
cardsRouter.route("/allCards").get(getAllCardsForAdmin).post(createCard);
cardsRouter.route("/:id").patch(updateCard).delete(toggleCardStatus);
export default cardsRouter;
