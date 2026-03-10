import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import axios from 'axios';

@Injectable()
export class LogisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getAddresses(userId: bigint) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(userId: bigint, dto: CreateAddressDto) {
    // 若设为默认地址，取消其他默认
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.create({
      data: { ...dto, userId },
    });
  }

  async updateAddress(userId: bigint, addressId: bigint, dto: UpdateAddressDto) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw new NotFoundException('地址不存在');

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    return this.prisma.address.update({
      where: { id: addressId },
      data: dto,
    });
  }

  async deleteAddress(userId: bigint, addressId: bigint) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) throw new NotFoundException('地址不存在');
    await this.prisma.address.delete({ where: { id: addressId } });
    return null;
  }

  /**
   * 追踪物流（REQ-053）
   * 调用快递100 API
   */
  async trackOrder(userId: bigint, orderId: bigint) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { logistics: true },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (!order.logistics) throw new NotFoundException('暂无物流信息');

    const logistics = order.logistics;

    // 调用快递100 API（若缓存数据不超过10分钟则直接返回缓存）
    if (logistics.trackingData) {
      return {
        company: logistics.company,
        trackingNo: logistics.trackingNo,
        status: logistics.status,
        tracks: logistics.trackingData,
      };
    }

    // 实际调用快递100 API
    // TODO: 完整实现快递100接口调用
    return {
      company: logistics.company,
      trackingNo: logistics.trackingNo,
      status: logistics.status,
      tracks: [],
    };
  }
}
