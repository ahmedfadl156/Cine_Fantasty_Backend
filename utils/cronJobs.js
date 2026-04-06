import cron from "node-cron";
import { syncBoxOfficeRevenues, syncUpcomingMovies } from "../services/syncUpcomingMovies.js";

cron.schedule("0 4 * * *" , () => {
    syncUpcomingMovies();
})

cron.schedule('0 12 * * 1', () => {
    syncBoxOfficeRevenues();
});