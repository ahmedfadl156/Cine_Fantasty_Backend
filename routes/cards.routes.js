import { Router } from "express";
import { protect, restrictTo } from "../controllers/auth.controller.js";
import { createCard, getAllCards, getAllCardsForAdmin, toggleCardStatus, updateCard } from "../controllers/cards.controller.js";

const cardsRouter = Router();

cardsRouter.use(protect);

cardsRouter.route("/").get(getAllCards).post(createCard);

cardsRouter.use(restrictTo("admin"));
cardsRouter.get("/allCards" , getAllCardsForAdmin);
cardsRouter.route("/:id").patch(updateCard).delete(toggleCardStatus);
export default cardsRouter;