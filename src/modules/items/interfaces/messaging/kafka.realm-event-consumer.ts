import { Controller } from '@nestjs/common';

// The realm.deleted consumer of the items module was commented out: deleting a realm does not delete the items of
// its games. Its dead handler is gone so the lint passes; the class stays registered until that is decided
// (F-strategic-02, spec 016).
@Controller()
export class KafkaItemEventConsumer {}
