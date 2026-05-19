import { IsString, IsUrl } from "@danet/core/validation";

export class CheckoutValidateRequestDto {
  @IsString()
  url: string;

  constructor(url: string) {
    this.url = url;
  }
}
