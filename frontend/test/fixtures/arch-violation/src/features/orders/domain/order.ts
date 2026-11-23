// Deliberate type-only violation (TS-ARCH-13): the domain imports a generated DTO type.
import type { OrderDto } from '../adapter/out/http/generated/model/order-dto';

export type Order = OrderDto;
