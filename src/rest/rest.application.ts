import { inject, injectable } from 'inversify';
import express, { Express } from 'express';
import cors from 'cors';

import { ILogger } from '../shared/libs/logger/index.js';
import { IConfig, TRestSchema } from '../shared/libs/config/index.js';
import { Component } from '../shared/types/index.js';
import { IDatabaseClient } from '../shared/libs/database-client/index.js';
import { getFullServerPath, getMongoURI } from '../shared/helpers/index.js';
import {
  IController,
  IExceptionFilter,
  ParseTokenMiddleware,
} from '../shared/libs/rest/index.js';
import { AppRoute, StaticRoute } from './rest.constant.js';
@injectable()
export class RestApplication {
  private readonly server: Express;
  constructor(
    @inject(Component.Logger) private readonly logger: ILogger,
    @inject(Component.Config) private readonly config: IConfig<TRestSchema>,
    @inject(Component.DatabaseClient)
    private readonly databaseClient: IDatabaseClient,
    @inject(Component.FavoriteController)
    private readonly favoriteController: IController,
    @inject(Component.ExceptionFilter)
    private readonly appExceptionFilter: IExceptionFilter,
    @inject(Component.UserController)
    private readonly userController: IController,
    @inject(Component.OfferController)
    private readonly offerController: IController,
    @inject(Component.CommentController)
    private readonly commentController: IController,
    @inject(Component.AuthExceptionFilter)
    private readonly authExceptionFilter: IExceptionFilter,
    @inject(Component.HttpExceptionFilter)
    private readonly httpExceptionFilter: IExceptionFilter,
    @inject(Component.ValidationExceptionFilter)
    private readonly validationExceptionFilter: IExceptionFilter
  ) {
    this.server = express();
  }

  private async initDb() {
    const mongoUri = getMongoURI(
      this.config.get('DB_USER'),
      this.config.get('DB_PASSWORD'),
      this.config.get('DB_HOST'),
      this.config.get('DB_PORT'),
      this.config.get('DB_NAME')
    );

    return this.databaseClient.connect(mongoUri);
  }

  private async _initServer() {
    const port = this.config.get('PORT');
    this.server.listen(port);
  }

  private async _initControllers() {
    this.server.use(AppRoute.Favorites, this.favoriteController.router);
    this.server.use(AppRoute.Users, this.userController.router);
    this.server.use(AppRoute.Root, this.offerController.router);
    this.server.use(AppRoute.Comments, this.commentController.router);
  }

  private async _initMiddleware() {
    const authenticateMiddleware = new ParseTokenMiddleware(
      this.config.get('JWT_SECRET')
    );
    this.server.use(express.json());
    this.server.use(cors());
    this.server.use(
      StaticRoute.Upload,
      express.static(this.config.get('UPLOAD_DIRECTORY'))
    );
    this.server.use(
      StaticRoute.Files,
      express.static(this.config.get('STATIC_DIRECTORY_PATH'))
    );
    this.server.use(
      authenticateMiddleware.execute.bind(authenticateMiddleware)
    );
  }

  private async _initExceptionFilters() {
    this.server.use(
      this.authExceptionFilter.catch.bind(this.authExceptionFilter)
    );
    this.server.use(
      this.validationExceptionFilter.catch.bind(this.validationExceptionFilter)
    );
    this.server.use(
      this.httpExceptionFilter.catch.bind(this.httpExceptionFilter)
    );
    this.server.use(
      this.appExceptionFilter.catch.bind(this.appExceptionFilter)
    );
  }

  public async init() {
    this.logger.info('Приложение инициализировано.');

    this.logger.info('Инициализация базы данных ...');
    await this.initDb();
    this.logger.info('Инициализация базы данных завершена.');

    this.logger.info(
      'Инициализация промежуточного программного обеспечения на уровне приложения ...'
    );
    await this._initMiddleware();
    this.logger.info(
      'Инициализация промежуточного программного обеспечения на уровне приложения завершена.'
    );

    this.logger.info('Инициализация контроллеров ...');
    await this._initControllers();
    this.logger.info('Инициализация контроллеров завершена.');

    this.logger.info('Инициализация фильтрации ошибок ...');
    await this._initExceptionFilters();
    this.logger.info('Инициализация фильтрации ошибок завершена.');

    this.logger.info('Попытка запустить сервер ...');
    await this._initServer();
    this.logger.info(
      `🚀 Server started on ${getFullServerPath(this.config.get('HOST'), this.config.get('PORT'))}`
    );
  }
}
