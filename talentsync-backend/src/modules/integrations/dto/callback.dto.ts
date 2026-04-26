import { IsString, IsNotEmpty } from 'class-validator';

export class CallbackDto {
    @IsString()
    @IsNotEmpty()
    provider: string;

    @IsString()
    @IsNotEmpty()
    code: string;

    @IsString()
    @IsNotEmpty()
    state: string;
}
