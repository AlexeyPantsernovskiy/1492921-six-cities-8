import { inject, injectable } from 'inversify';
import { DocumentType, types } from '@typegoose/typegoose';

import { IOfferService } from './offer-service.interface.js';
import { Component, SortType, TCityName } from '../../types/index.js';
import { ILogger } from '../../libs/logger/index.js';
import { OfferEntity } from './offer.entity.js';
import { CreateOfferDto } from './dto/create-offer.dto.js';
import { UpdateOfferDto } from './dto/update-offer.dto.js';
import { DefaultCount } from './offer.constant.js';

@injectable()
export class DefaultOfferService implements IOfferService {
  constructor(
    @inject(Component.Logger) private readonly logger: ILogger,
    @inject(Component.OfferModel)
    private readonly offerModel: types.ModelType<OfferEntity>
  ) {}

  public async create(dto: CreateOfferDto): Promise<DocumentType<OfferEntity>> {
    const result = await this.offerModel.create(dto);
    this.logger.info(`Новое предложение аренды создано: ${dto.title}`);

    return result;
  }

  public async findById(
    offerId: string
  ): Promise<DocumentType<OfferEntity> | null> {
    return this.offerModel.findById(offerId).populate('hostId').exec();
  }

  public async find(count?: number): Promise<DocumentType<OfferEntity>[]> {
    const limit = count ?? DefaultCount.offer;
    return this.offerModel.find({}, {}, { limit }).populate('hostId').exec();
  }

  public async deleteById(
    offerId: string
  ): Promise<DocumentType<OfferEntity> | null> {
    return this.offerModel.findByIdAndDelete(offerId).exec();
  }

  public async updateById(
    offerId: string,
    dto: UpdateOfferDto
  ): Promise<DocumentType<OfferEntity> | null> {
    return this.offerModel
      .findByIdAndUpdate(offerId, dto, { new: true })
      .populate('hostId')
      .exec();
  }

  public async findFavorites(
    userId: string
  ): Promise<DocumentType<OfferEntity>[]> {
    // Нужна еще одна таблица для хранения Избранных, связывающая предложения и пользователей
    // Но как связать 2 таблицы и потом сделать фильтрацию по связанной таблице пока не понятно
    // поэтому пока делаю тупо - как будто избранное отмечает владелец предложения
    return this.offerModel
      .find({ hostId: userId, isFavorite: true }, {}, {})
      .populate('hostId')
      .exec();
  }

  public async findPremium(
    cityName: TCityName
  ): Promise<DocumentType<OfferEntity>[]> {
    const limit = DefaultCount.premium;
    return this.offerModel
      .find({ city: { name: cityName }, isPremium: true }, {}, { limit })
      .populate('hostId')
      .exec();
  }

  public async exists(documentId: string): Promise<boolean> {
    return (await this.offerModel.exists({ _id: documentId })) !== null;
  }

  public async incCommentCount(
    offerId: string
  ): Promise<DocumentType<OfferEntity> | null> {
    return this.offerModel
      .findByIdAndUpdate(offerId, {
        $inc: {
          commentCount: 1,
        },
      })
      .exec();
  }

  public async findNew(count: number): Promise<DocumentType<OfferEntity>[]> {
    const limit = count ?? DefaultCount.offer;
    return this.offerModel
      .find()
      .sort({ createdAt: SortType.Down })
      .limit(limit)
      .populate('hostId')
      .exec();
  }
}
